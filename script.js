/* build: landscape-16x9 · Intro x2 + typewriter · Diálogo Risko/Hans/Guardian · Tutorial interactivo · Combates encadenados con Fortaleza · PNG tolerant */
(function(){
  // --- Dimensiones tablero 16×9 ---
  const ROWS = 9, COLS = 16;
  const NON_PLAYABLE_BOTTOM_ROWS = 2;

  // Parámetros
  const PLAYER_MAX_MP = 5;
  const ENEMY_BASE_DAMAGE = 50;

  // Estado
  let turno = "jugador";
  let fase = 1;
  let enemies = [];
  let players = [];
  let seleccionado = null;
  let celdasMovibles = new Set();
  let distSel = null;

  // --- Helper: tolerante a .PNG/.png ---
  function loadImgCaseTolerant(imgEl, src){
    imgEl.src = src;
    imgEl.onerror = ()=>{
      if (src.endsWith('.PNG')) imgEl.src = src.replace(/\.PNG$/, '.png');
      else if (src.endsWith('.png')) imgEl.src = src.replace(/\.png$/, '.PNG');
      imgEl.onerror = null;
    };
  }

  // ---------- Intro ----------
  const INTRO_PAGES = [
    {
      img: "assets/Inicio1.PNG",
      text: "El reino de Orbis era un lugar de paz, donde hacía mucho que la espada y la magia no se usaban en combate y sus amables gentes disfrutaban de la vida."
    },
    {
      img: "assets/Inicio2.PNG",
      text: "Pero todo cambió cuando el Rey Ardiem fue traicionado y su fiel capitana de la Guardia, obligada a huir…"
    }
  ];

  // ---------- Diálogos ----------
  const dialogLines = [
    { who:'knight', name:'Risko', text:'Llevamos días huyendo y aún nos persiguen esos dichosos soldados.' },
    { who:'archer', name:'Hans',  text:'Han matado al Rey y te han acusado a ti, además ni siquiera sabemos quien fue...' },
    { who:'knight', name:'Risko', text:'Tengo mis sospechas pero ninguna prueba. Eres el único miembro de la Guardia que me queda, Hans.' },
    { who:'archer', name:'Hans',  text:'Te seguiré siempre, capitana. De momento sólo podemos huir, y prepárate porque ahí vienen de nuevo.' }
  ];

  const postBattleDialogLines = [
    { who:'archer', name:'Hans',  text:'Lo hemos conseguido, capitana.' },
    { who:'knight', name:'Risko', text:'Sí, pero es demasiado pronto para cantar victoria. Están por todas partes, ocultémonos en la fortaleza.' }
  ];

  const fortDialogLines = [
    { who:'archer',  name:'Hans',     text:'Lo hemos logrado, Capitana. Hemos podido refugiarnos en la fortaleza.' },
    { who:'knight',  name:'Risko',    text:'No cantes victoria tan rápido. Tengo un mal presentimiento.' },
    { who:'guardian',name:'Guardián', text:'Vaya, vaya. Parece que dos pajaritos han caído en nuestra trampa. Estos muros serán vuestra muerte…' },
    { who:'knight',  name:'Risko',    text:'¡Un Guardián! Uno de los soldados destacados del reino.' },
    { who:'archer',  name:'Hans',     text:'Después de nosotros, claro.' },
    { who:'guardian',name:'Guardián', text:'El Rey Fortris ordena tu ejecución.' },
    { who:'knight',  name:'Risko',    text:'¡Fortris no es un rey legítimo! ¡Asesinos!' },
    { who:'guardian',name:'Guardián', text:'Cuando acabe con su última pieza para ganar la partida, lo será.' },
    { who:'knight',  name:'Risko',    text:'¿Yo soy su última pieza?' },
    { who:'archer',  name:'Hans',     text:'¡Cuidado! ¡Ahí vienen!' }
  ];

  // Control de diálogos
  let currentDialogLines = dialogLines;
  let dlgIndex = 0;
  let afterDialogAction = 'startTutorial'; // startTutorial | toFortress

  // --- DOM ---
  const mapa = document.getElementById("mapa");
  const acciones = document.getElementById("acciones");
  const ficha = document.getElementById("ficha");
  const overlayWin = document.getElementById("overlayWin");
  const btnContinuar = document.getElementById("btnContinuar");
  const turnBanner = document.getElementById("turnBanner");

  const portada = document.getElementById("portada");
  const btnJugar = document.getElementById("btnJugar");

  // Intro DOM
  const intro = document.getElementById("introScene");
  const introImg = document.getElementById("introImg");
  const introTextEl = document.getElementById("introText");
  const btnIntroNext = document.getElementById("btnIntroNext");

  // Diálogo DOM
  const dialog = document.getElementById("dialogScene");
  const dialogNameEl = document.getElementById("dialogName");
  const dialogTextEl = document.getElementById("dialogText");
  const btnDialogNext = document.getElementById("btnDialogNext");
  const charKnight = document.getElementById("charKnight");   // Risko
  const charArcher = document.getElementById("charArcher");   // Hans
  let charGuardian = document.getElementById("charGuardian"); // Guardián (lo añadimos dinámico)

  // Carga de imágenes
  if (charKnight)  loadImgCaseTolerant(charKnight, "assets/GuerreraDialogo.PNG");
  if (charArcher)  loadImgCaseTolerant(charArcher, "assets/ArqueroDialogo.PNG");

  // Creamos si no existe el contenedor del guardián
  if (!charGuardian){
    charGuardian = document.createElement("img");
    charGuardian.id = "charGuardian";
    charGuardian.className = "dialog-char right";
    charGuardian.style.display = "none";
    dialog.appendChild(charGuardian);
    loadImgCaseTolerant(charGuardian,"assets/GuardianDialogo.PNG");
  }

  // ---------- Diálogo Engine ----------
  function clearPop(){ [charKnight, charArcher, charGuardian].forEach(el=>el && el.classList.remove('pop','speaking')); }

  function setActiveSpeaker(){
    const line = currentDialogLines[dlgIndex];
    if (!line) return;
    clearPop();

    // Mostrar/ocultar personajes según escena
    if (currentDialogLines === fortDialogLines){
      if (line.who === 'guardian'){
        charGuardian.style.display = "block";
        charKnight.style.left = "10%";
        charArcher.style.left = "25%";
      } else {
        charGuardian.style.display = "none";
        charKnight.style.left = "";
        charArcher.style.left = "";
      }
    }

    // Iluminar al que habla
    [charKnight,charArcher,charGuardian].forEach(el=>{ if(el) el.style.opacity=".6"; });
    if (line.who === 'knight'){ charKnight.style.opacity="1"; charKnight.classList.add('speaking'); }
    if (line.who === 'archer'){ charArcher.style.opacity="1"; charArcher.classList.add('speaking'); }
    if (line.who === 'guardian'){ charGuardian.style.opacity="1"; charGuardian.classList.add('speaking'); }

    if (dialogNameEl) dialogNameEl.textContent = line.name;
  }

  function typeWriterDialog(text, speed=22){
    dialogTextEl.textContent = '';
    let i=0;
    function step(){
      if (i <= text.length){
        dialogTextEl.textContent = text.slice(0,i);
        i++;
        setTimeout(step,speed);
      }
    }
    step();
  }

  function showCurrentDialog(){
    const line = currentDialogLines[dlgIndex];
    if (!line) return;
    setActiveSpeaker();
    typeWriterDialog(line.text);
  }

  function advanceDialog(){
    dlgIndex++;
    if (dlgIndex >= currentDialogLines.length){
      dialog.style.display="none";
      if (afterDialogAction === 'startTutorial'){
        startTutorial();
      } else if (afterDialogAction === 'toFortress'){
        startBattleScene2();
      }
      return;
    }
    showCurrentDialog();
  }

  if (btnDialogNext) btnDialogNext.onclick = advanceDialog;

  // ---------- Unidades jugador ----------
  const makeKnight = () => ({
    id: "K", tipo: "caballero",
    fila: Math.floor(ROWS*0.55), col: Math.floor(COLS*0.25),
    vivo: true, nombre: "Risko",
    hp: 100, maxHp: 100,
    retrato: "assets/player.PNG", nivel: 1, kills: 0,
    damage: 50, range: [1], acted: false, mp: PLAYER_MAX_MP
  });
  const makeArcher = () => ({
    id: "A", tipo: "arquera",
    fila: Math.floor(ROWS*0.55), col: Math.floor(COLS*0.20),
    vivo: true, nombre: "Hans",
    hp: 80, maxHp: 80,
    retrato: "assets/archer.PNG", nivel: 1, kills: 0,
    damage: 50, range: [2], acted: false, mp: PLAYER_MAX_MP
  });

  // ---------- Escena Fortaleza ----------
  function startBattleScene2(){
    mapa.style.display="grid";
    players=[makeKnight(),makeArcher()];
    enemies=[]; seleccionado=null; celdasMovibles.clear();
    const lastPlayableRow = ROWS - NON_PLAYABLE_BOTTOM_ROWS - 1;
    const centerCol = Math.floor(COLS/2);
    enemies.push({
      id:"Guardian", nombre:"Guardián",
      fila:lastPlayableRow,col:centerCol,vivo:true,
      hp:200,maxHp:200,
      retrato:"assets/Guardian.PNG",
      damage:70,mpMax:1
    });
    dibujarMapa();
    showBattleStart();
    setTurno("jugador");
  }

  // TODO: resto de funciones de combate, IA, tutorial... (idénticas a la última versión que ya tienes, solo se han modificado las partes de diálogo y startBattleScene2)

  // ---------- Init ----------
  function init(){
    if (btnJugar){
      btnJugar.onclick=()=>{
        portada.style.display="none";
        intro.style.display="block";
        dlgIndex=0; currentDialogLines=dialogLines; afterDialogAction="startTutorial";
        showIntroPage(0);
      };
    }
    if (btnContinuar){
      btnContinuar.onclick=()=>{
        overlayWin.style.display="none";
        currentDialogLines=fortDialogLines;
        dlgIndex=0; afterDialogAction="toFortress";
        dialog.style.display="block";
        showCurrentDialog();
      };
    }
  }
  init();
})();