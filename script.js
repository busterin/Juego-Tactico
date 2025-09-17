/* build: landscape-16x9 · Save/Load + Nueva/Cargar partida + Tutorial + Fortaleza + Guardian */
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
  let currentScene = "portada"; // portada, intro, dialog, battle

  // Guardado
  const SAVE_KEY = "tactic-heroes-save";

  // --- Helper: tolerante a .PNG/.png ---
  function loadImgCaseTolerant(imgEl, src){
    if(!imgEl) return;
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

  // ---------- Diálogo ----------
  // (ejemplo: escena 1 – Risko/Hans)
  const dialogLines1 = [
    { who:'knight', name:'Risko', text:'Llevamos días huyendo y aún nos persiguen esos dichosos soldados.' },
    { who:'archer', name:'Hans',  text:'Han matado al Rey y te han acusado a ti, además ni siquiera sabemos quien fue...' },
    { who:'knight', name:'Risko', text:'Tengo mis sospechas pero ninguna prueba. Eres el único miembro de la Guardia que me queda, Hans.' },
    { who:'archer', name:'Hans',  text:'Te seguiré siempre, capitana. De momento sólo podemos huir, y prepárate porque ahí vienen de nuevo.' }
  ];
  // (ejemplo: escena Fortaleza – Risko/Hans/Guardian)
  const dialogLinesFort = [
    { who:'archer', name:'Hans', text:'Lo hemos logrado, Capitana. Hemos podido refugiarnos en la fortaleza.' },
    { who:'knight', name:'Risko', text:'No cantes victoria tan rápido. Tengo un mal presentimiento.' },
    { who:'guardian', name:'Guardián', text:'Vaya, vaya. Parece que dos pajaritos han caído en nuestra trampa. Estos muros serán vuestra muerte…' },
    { who:'knight', name:'Risko', text:'¡Un Guardian! Uno de los soldados destacados del reino.' },
    { who:'archer', name:'Hans', text:'Después de nosotros, claro.' },
    { who:'guardian', name:'Guardián', text:'El Rey Fortris ordena tu ejecución.' },
    { who:'knight', name:'Risko', text:'¡Fortris no es un rey legítimo! ¡Asesinos!' },
    { who:'guardian', name:'Guardián', text:'Cuando acabe con su última pieza para ganar la partida, lo será.' },
    { who:'knight', name:'Risko', text:'¿Yo soy su última pieza?' },
    { who:'archer', name:'Hans', text:'¡Cuidado! ¡Ahí vienen!' }
  ];
  let currentDialogLines = dialogLines1;
  let dlgIndex = 0;

  function showCurrentDialog(){
    const line = currentDialogLines[dlgIndex];
    if (!line) return;
    if (dialogNameEl) dialogNameEl.textContent = line.name;
    if (dialogTextEl) dialogTextEl.textContent = line.text;
    // Mostrar/ocultar personajes
    if (charKnight) charKnight.style.display = (line.who==='knight')?'block':'block';
    if (charArcher) charArcher.style.display = (line.who==='archer')?'block':'block';
    if (charGuardian) charGuardian.style.display = (line.who==='guardian')?'block':'none';
  }

  function advanceDialog(){
    dlgIndex++;
    if (dlgIndex >= currentDialogLines.length){
      dialog.style.display="none";
      mapa.style.display="grid";
      setTurno("jugador");
      showCombatStartMessage();
      return;
    }
    showCurrentDialog();
  }

  // ---------- Unidades ----------
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

  // DOM
  const mapa = document.getElementById("mapa");
  const acciones = document.getElementById("acciones");
  const ficha = document.getElementById("ficha");
  const overlayWin = document.getElementById("overlayWin");
  const btnContinuar = document.getElementById("btnContinuar");
  const turnBanner = document.getElementById("turnBanner");
  const portada = document.getElementById("portada");
  const btnNuevaPartida = document.getElementById("btnNuevaPartida");
  const btnCargarPartida = document.getElementById("btnCargarPartida");

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
  const charKnight = document.getElementById("charKnight");
  const charArcher = document.getElementById("charArcher");
  const charGuardian = document.getElementById("charGuardian");

  // Banner inicio combate
  const battleStartBanner = document.getElementById("battleStartBanner");
  const battleStartSound = document.getElementById("battleStartSound");

  // ---------- Turnos ----------
  function showTurnBanner(text){
    turnBanner.textContent = text;
    turnBanner.style.display = "block";
    setTimeout(()=>{ turnBanner.style.display="none"; }, 1300);
  }
  function setTurno(t){
    turno = t;
    if (t==="jugador") showTurnBanner("TU TURNO");
    else if (t==="enemigo") showTurnBanner("TURNO ENEMIGO");
  }

  // ---------- Combat Start ----------
  function showCombatStartMessage(){
    if (!battleStartBanner) return;
    battleStartBanner.style.display="block";
    if (battleStartSound) battleStartSound.play().catch(()=>{});
    setTimeout(()=>{ battleStartBanner.style.display="none"; }, 2000);
  }

  // ---------- Guardar/Cargar ----------
  function saveGame(){
    const save = {
      players, enemies, fase, turno, currentScene
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    alert("Partida guardada.");
  }
  function loadGame(){
    const raw = localStorage.getItem(SAVE_KEY);
    if(!raw){ alert("No hay partida guardada."); return; }
    try{
      const save = JSON.parse(raw);
      players = save.players||[];
      enemies = save.enemies||[];
      fase = save.fase||1;
      turno = save.turno||"jugador";
      currentScene = save.currentScene||"portada";
      portada.style.display="none";
      mapa.style.display="grid";
      dibujarMapa();
      setTurno(turno);
    }catch(e){ console.error(e); alert("Error al cargar partida."); }
  }
  function newGame(){
    localStorage.removeItem(SAVE_KEY);
    portada.style.display="none";
    if (intro){
      intro.style.display="block";
      introPageIndex = 0;
      showIntroPage(introPageIndex);
    }
  }

  // ---------- Render tablero (simplificado) ----------
  function dibujarMapa(){
    mapa.querySelectorAll(".celda").forEach(n=>n.remove());
    for (let f=0; f<ROWS; f++){
      for (let c=0; c<COLS; c++){
        const celda = document.createElement("div");
        celda.className = "celda";
        celda.dataset.key = `${f},${c}`;
        mapa.appendChild(celda);
      }
    }
  }

  // ---------- Init ----------
  function init(){
    if (btnIntroNext) btnIntroNext.onclick=()=>{
      if (introPageIndex < INTRO_PAGES.length - 1){
        introPageIndex++;
        showIntroPage(introPageIndex);
      } else {
        intro.style.display="none";
        dialog.style.display="block";
        dlgIndex=0; currentDialogLines = dialogLines1;
        showCurrentDialog();
      }
    };
    if (btnDialogNext) btnDialogNext.onclick=advanceDialog;
    if (btnContinuar) btnContinuar.onclick=()=>{ overlayWin.style.display="none"; };

    if (btnNuevaPartida) btnNuevaPartida.onclick=()=> newGame();
    if (btnCargarPartida) btnCargarPartida.onclick=()=> loadGame();

    // Triple seguro global
    window.TH_newGame = ()=> newGame();
    window.TH_loadGame = ()=> loadGame();
    document.addEventListener('click', (ev)=>{
      if(ev.target.closest('#btnNuevaPartida')){ ev.preventDefault(); newGame(); }
      if(ev.target.closest('#btnCargarPartida')){ ev.preventDefault(); loadGame(); }
    });
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();