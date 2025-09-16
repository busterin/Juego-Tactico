/* build: landscape-16x9 · Intro x2 + typewriter · Tutorial · Fortaleza con Guardian · Diálogos Risko/Hans */
(function(){
  // --- Dimensiones tablero 16×9 ---
  const ROWS = 9, COLS = 16;
  const NON_PLAYABLE_BOTTOM_ROWS = 2;

  // Parámetros
  const PLAYER_MAX_MP = 5;
  const ENEMY_MAX_MP  = 3;
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
  let introTyping = false, introTypeTimer = null, introPageIndex = 0;

  function typeWriterIntro(text, speed=22){
    if (!introTextEl) return;
    introTyping = true;
    introTextEl.textContent = '';
    introTextEl.classList.add('type-cursor');
    let i = 0;
    function step(){
      if (i <= text.length){
        introTextEl.textContent = text.slice(0,i);
        i++;
        introTypeTimer = setTimeout(step, speed);
      } else {
        introTyping = false;
        introTextEl.classList.remove('type-cursor');
      }
    }
    step();
  }

  function showIntroPage(idx){
    const page = INTRO_PAGES[idx];
    if (!page) return;
    if (introImg) loadImgCaseTolerant(introImg, page.img);
    if (introTextEl){
      clearTimeout(introTypeTimer);
      typeWriterIntro(page.text, 22);
    }
  }

  // ---------- Diálogos ----------
  let currentDialogLines = [];
  let dlgIndex = 0, typing=false, typeTimer=null, speakPopTimer=null;
  let afterDialogAction = null;

  const dialogLines1 = [
    { who:'knight', name:'Risko', text:'Llevamos días huyendo y aún nos persiguen esos dichosos soldados.' },
    { who:'archer', name:'Hans',  text:'Han matado al Rey y te han acusado a ti, además ni siquiera sabemos quien fue...' },
    { who:'knight', name:'Risko', text:'Tengo mis sospechas pero ninguna prueba. Eres el único miembro de la Guardia que me queda, Hans.' },
    { who:'archer', name:'Hans',  text:'Te seguiré siempre, capitana. De momento sólo podemos huir, y prepárate porque ahí vienen de nuevo.' }
  ];

  const fortDialogLines = [
    { who:'archer', name:'Hans',    text:'Lo hemos logrado, Capitana. Hemos podido refugiarnos en la fortaleza.' },
    { who:'knight', name:'Risko',   text:'No cantes victoria tan rápido. Tengo un mal presentimiento.' },
    { who:'guardian', name:'Guardián', text:'Vaya, vaya. Parece que dos pajaritos han caído en nuestra trampa. Estos muros serán vuestra muerte…' },
    { who:'knight', name:'Risko',   text:'¡Un Guardián! Uno de los soldados destacados del reino.' },
    { who:'archer', name:'Hans',    text:'Después de nosotros, claro.' },
    { who:'guardian', name:'Guardián', text:'El Rey Fortris ordena tu ejecución.' },
    { who:'knight', name:'Risko',   text:'¡Fortris no es un rey legítimo! ¡Asesinos!' },
    { who:'guardian', name:'Guardián', text:'Cuando acabe con su última pieza para ganar la partida, lo será.' },
    { who:'knight', name:'Risko',   text:'¿Yo soy su última pieza?' },
    { who:'archer', name:'Hans',    text:'¡Cuidado! ¡Ahí vienen!' }
  ];

  function clearPop(){ [charKnight, charArcher, charGuardian].forEach(el=>el && el.classList.remove('speaking')); }
  function setActiveSpeaker(){
    clearTimeout(speakPopTimer);
    const line = currentDialogLines[dlgIndex];
    if (!line) return;
    if (charKnight) charKnight.style.opacity = '.6';
    if (charArcher) charArcher.style.opacity = '.6';
    if (charGuardian) charGuardian.style.opacity = '.6';
    if (line.who === 'knight'){ charKnight.style.opacity='1'; charKnight.classList.add('speaking'); }
    if (line.who === 'archer'){ charArcher.style.opacity='1'; charArcher.classList.add('speaking'); }
    if (line.who === 'guardian'){ charGuardian.style.opacity='1'; charGuardian.classList.add('speaking'); }
    if (dialogNameEl) dialogNameEl.textContent = line.name;
  }

  function typeWriterDialog(text, speed=22){
    typing = true;
    dialogTextEl.textContent = '';
    dialogTextEl.classList.add('type-cursor');
    let i = 0;
    function step(){
      if (i <= text.length){
        dialogTextEl.textContent = text.slice(0,i);
        i++;
        typeTimer = setTimeout(step, speed);
      } else {
        typing = false;
        dialogTextEl.classList.remove('type-cursor');
      }
    }
    step();
  }

  function showCurrentDialog(){
    const line = currentDialogLines[dlgIndex];
    if (!line) return;
    setActiveSpeaker();
    clearTimeout(typeTimer);
    typeWriterDialog(line.text);
  }

  function advanceDialog(){
    if (!dialog) return;
    const line = currentDialogLines[dlgIndex];
    if (typing){
      clearTimeout(typeTimer);
      dialogTextEl.textContent = line.text;
      typing = false;
      dialogTextEl.classList.remove('type-cursor');
      return;
    }
    dlgIndex++;
    clearPop();
    if (dlgIndex >= currentDialogLines.length){
      dialog.style.display = "none";
      if (afterDialogAction === 'startBattle'){
        mapa.style.display = "grid";
        setTurno("jugador");
        showCombatStartMessage();
      } else if (afterDialogAction === 'startScene2Dialog'){
        startScene2Dialog();
      } else if (afterDialogAction === 'startBattleScene2'){
        mapa.style.display = "grid";
        setTurno("jugador");
        spawnGuardian();
        showCombatStartMessage();
      }
      return;
    }
    showCurrentDialog();
    applyFortressDialogLayout();
  }

  // --- Layout especial Fortaleza ---
  function applyFortressDialogLayout(){
    if (currentDialogLines !== fortDialogLines) return;
    if (!charKnight || !charArcher || !charGuardian) return;
    const guardianHasAppeared = dlgIndex >= 2;
    if (guardianHasAppeared){
      charGuardian.style.display = "block";
      charGuardian.classList.add('left');
      charKnight.classList.add('right');
      charArcher.classList.add('right');
      charArcher.classList.add('flip'); // mirar al guardián
    } else {
      resetDialogPortraitPositions();
    }
  }

  function resetDialogPortraitPositions(){
    if (!charKnight || !charArcher || !charGuardian) return;
    charGuardian.style.display = "none";
    charKnight.classList.add('right');
    charArcher.classList.add('left');
    charArcher.classList.remove('flip');
  }

  // Unidades jugador
  const makeKnight = () => ({
    id: "K", tipo: "caballero", nombre: "Risko",
    fila: Math.floor(ROWS*0.55), col: Math.floor(COLS*0.25),
    vivo: true, hp: 100, maxHp: 100,
    retrato: "assets/player.PNG", nivel: 1, kills: 0,
    damage: 50, range: [1], acted: false, mp: PLAYER_MAX_MP
  });
  const makeArcher = () => ({
    id: "A", tipo: "arquero", nombre: "Hans",
    fila: Math.floor(ROWS*0.55), col: Math.floor(COLS*0.20),
    vivo: true, hp: 80, maxHp: 80,
    retrato: "assets/archer.PNG", nivel: 1, kills: 0,
    damage: 50, range: [2], acted: false, mp: PLAYER_MAX_MP
  });
  const makeGuardian = () => ({
    id: "G", tipo: "guardian", nombre: "Guardián",
    fila: ROWS-1, col: Math.floor(COLS/2),
    vivo: true, hp: 200, maxHp: 200,
    retrato: "assets/Guardian.PNG",
    nivel: 3, kills: 0, damage: 70,
    range: [1], acted: false, mp: 1
  });

  // DOM
  const mapa = document.getElementById("mapa");
  const acciones = document.getElementById("acciones");
  const ficha = document.getElementById("ficha");
  const overlayWin = document.getElementById("overlayWin");
  const btnContinuar = document.getElementById("btnContinuar");
  const turnBanner = document.getElementById("turnBanner");

  const portada = document.getElementById("portada");
  const btnJugar = document.getElementById("btnJugar");

  const intro = document.getElementById("introScene");
  const introImg = document.getElementById("introImg");
  const introTextEl = document.getElementById("introText");
  const btnIntroNext = document.getElementById("btnIntroNext");

  const dialog = document.getElementById("dialogScene");
  const dialogNameEl = document.getElementById("dialogName");
  const dialogTextEl = document.getElementById("dialogText");
  const btnDialogNext = document.getElementById("btnDialogNext");
  const charKnight = document.getElementById("charKnight");
  const charArcher = document.getElementById("charArcher");
  const charGuardian = document.getElementById("charGuardian");

  // ---------- Banner turno ----------
  function showTurnBanner(text){
    turnBanner.textContent = text;
    turnBanner.style.display = "block";
    setTimeout(()=>{ turnBanner.style.display = "none"; }, 1300);
  }
  function setTurno(t){
    turno = t;
    showTurnBanner(t==="jugador" ? "TU TURNO" : t==="enemigo" ? "TURNO ENEMIGO" : "FIN DE PARTIDA");
  }

  // ---------- Mensaje combate ----------
  function showCombatStartMessage(){
    const banner = document.createElement("div");
    banner.textContent = "¡COMIENZA EL COMBATE!";
    banner.style.position="fixed";
    banner.style.inset="0";
    banner.style.display="flex";
    banner.style.alignItems="center";
    banner.style.justifyContent="center";
    banner.style.fontSize="42px";
    banner.style.fontWeight="900";
    banner.style.color="#fff";
    banner.style.background="rgba(0,0,0,0.7)";
    banner.style.zIndex="25000";
    document.body.appendChild(banner);
    setTimeout(()=>banner.remove(), 2000);
  }

  // ---------- Escenas ----------
  function startScene2Dialog(){
    setBackgroundAsset("assets/Fortaleza.PNG");
    if (ficha) ficha.style.display = "none";
    if (acciones) acciones.innerHTML = "";
    if (mapa) mapa.style.display = "none";
    currentDialogLines = fortDialogLines;
    afterDialogAction = 'startBattleScene2';
    dlgIndex = 0;
    resetDialogPortraitPositions();
    if (dialog){
      dialog.style.display = "block";
      showCurrentDialog();
    }
  }

  function spawnGuardian(){
    enemies.push(makeGuardian());
    dibujarMapa();
  }

  // ---------- Utils ----------
  function setBackgroundAsset(url){
    document.documentElement.style.setProperty('--bg-url', `url("${url}")`);
  }

  // ... (resto de funciones de tablero, HUD, IA, etc. como ya tenías) ...

  // ---------- Init ----------
  function init(){
    players=[makeKnight(),makeArcher()];
    ajustarTamanoTablero(); spawnFase(); dibujarMapa();
    if (btnContinuar) btnContinuar.onclick=()=>{ overlayWin.style.display="none"; startScene2Dialog(); };

    if (portada) portada.style.display = "flex";
    if (intro)   intro.style.display   = "none";
    if (dialog)  dialog.style.display  = "none";
    if (mapa)    mapa.style.display    = "none";

    if (btnJugar){
      btnJugar.onclick = ()=>{
        portada.style.display = "none";
        if (intro){
          intro.style.display = "block";
          introPageIndex = 0;
          showIntroPage(introPageIndex);
        } else {
          dlgIndex = 0; currentDialogLines = dialogLines1; afterDialogAction = 'startBattle';
          dialog.style.display = "block"; showCurrentDialog();
        }
      };
    }

    if (btnIntroNext){
      btnIntroNext.onclick = ()=>{
        const page = INTRO_PAGES[introPageIndex];
        if (introTyping){
          clearTimeout(introTypeTimer);
          introTextEl.textContent = page.text;
          introTextEl.classList.remove('type-cursor');
          introTyping = false;
          return;
        }
        if (introPageIndex < INTRO_PAGES.length - 1){
          introPageIndex++;
          showIntroPage(introPageIndex);
        } else {
          intro.style.display = "none";
          dlgIndex = 0; currentDialogLines = dialogLines1; afterDialogAction = 'startBattle';
          dialog.style.display = "block"; showCurrentDialog();
        }
      };
    }

    if (btnDialogNext) btnDialogNext.onclick = advanceDialog;
  }
  init();
})();