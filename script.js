/* build: landscape-16x9 · Save/Load · Intro x4 · Tutorial · Risko/Hans/Guardian · Rejilla G */
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

  // ---------- Intro (Fire Emblem-like) ----------
  const INTRO_PAGES = [
    {
      img: "assets/Inicio1.PNG",
      text: "El reino de Orbis era un lugar de paz, donde hacía mucho que la espada y la magia no se usaban en combate y sus amables gentes disfrutaban de la vida."
    },
    {
      img: "assets/Inicio2.PNG",
      text: "De la noche a la mañana, el actual regente, Adriem III, fue asesinado sin compasión y su trono usurpado."
    },
    {
      img: "assets/Inicio3.PNG",
      text: "Un noble al que pocos conocían, el autoproclamado rey Frortris, se hizo con el poder. Muchos comentan que ni siquiera es humano…"
    },
    {
      img: "assets/Inicio4.PNG",
      text: "Tan solo la capitana de la guardia del rey Adriem logró huir, con un pensamiento claro: Cobrar venganza."
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
  const dialogLinesFortaleza = [
    { who:'hans', name:'Hans', text:'Lo hemos logrado, Capitana. Hemos podido refugiarnos en la fortaleza.' },
    { who:'risko', name:'Risko', text:'No cantes victoria tan rápido. Tengo un mal presentimiento.' },
    { who:'guardian', name:'Guardian', text:'Vaya, vaya. Parece que dos pajaritos han caído en nuestra trampa. Estos muros serán vuestra muerte…' },
    { who:'risko', name:'Risko', text:'¡Un Guardian! Uno de los soldados destacados del reino.' },
    { who:'hans', name:'Hans', text:'Después de nosotros, claro.' },
    { who:'guardian', name:'Guardian', text:'El Rey Fortris ordena tu ejecución.' },
    { who:'risko', name:'Risko', text:'¡Fortris no es un rey legítimo! ¡Asesinos!' },
    { who:'guardian', name:'Guardian', text:'Cuando acabe con su última pieza para ganar la partida, lo será.' },
    { who:'risko', name:'Risko', text:'¿Yo soy su última pieza?' },
    { who:'hans', name:'Hans', text:'¡Cuidado! ¡Ahí vienen!' }
  ];

  const dialogLinesIntro = [
    { who:'risko', name:'Risko', text:'Llevamos días huyendo y aún nos persiguen esos dichosos soldados.' },
    { who:'hans', name:'Hans',  text:'Han matado al Rey y te han acusado a ti, además ni siquiera sabemos quién fue...' },
    { who:'risko', name:'Risko', text:'Tengo mis sospechas pero ninguna prueba. Eres el único miembro de la Guardia que me queda, Hans.' },
    { who:'hans', name:'Hans',  text:'Te seguiré siempre, capitana. De momento sólo podemos huir, y prepárate porque ahí vienen de nuevo.' }
  ];
    // --- Estado diálogo ---
  let currentDialog = dialogLinesIntro;
  let dlgIndex = 0, typing=false, typeTimer=null;
  let afterDialogAction = null;

  // ---------- DOM ----------
  const portada       = document.getElementById("portada");
  const btnNueva      = document.getElementById("btnNuevaPartida") || document.getElementById("btnNueva");
  const btnCargar     = document.getElementById("btnCargarPartida") || document.getElementById("btnCargar");

  const intro         = document.getElementById("introScene");
  const introImg      = document.getElementById("introImg");
  const introTextEl   = document.getElementById("introText");
  const btnIntroNext  = document.getElementById("btnIntroNext");

  const dialog        = document.getElementById("dialogScene");
  const dialogNameEl  = document.getElementById("dialogName");
  const dialogTextEl  = document.getElementById("dialogText");
  const btnDialogNext = document.getElementById("btnDialogNext");

  const charRisko     = document.getElementById("charKnight");   // Risko (derecha)
  const charHans      = document.getElementById("charArcher");   // Hans (izquierda)
  let   charGuardian  = document.getElementById("charGuardian"); // Guardián (izquierda, oculto hasta escena fortaleza)

  const overlayWin    = document.getElementById("overlayWin");
  const btnContinuar  = document.getElementById("btnContinuar");
  const turnBanner    = document.getElementById("turnBanner");
  const battleBanner  = document.getElementById("battleStartBanner");
  const battleSound   = document.getElementById("battleStartSound");

  const acciones      = document.getElementById("acciones");
  const ficha         = document.getElementById("ficha");

  // Asegurar guardian img si no existiera
  if (!charGuardian && dialog){
    charGuardian = document.createElement("img");
    charGuardian.id = "charGuardian";
    charGuardian.className = "dialog-char left";
    charGuardian.style.display = "none";
    dialog.appendChild(charGuardian);
  }

  // Cargar retratos (tolerante .PNG/.png)
  if (charRisko)    loadImgCaseTolerant(charRisko,    "assets/GuerreraDialogo.PNG");
  if (charHans)     loadImgCaseTolerant(charHans,     "assets/ArqueroDialogo.PNG");
  if (charGuardian) loadImgCaseTolerant(charGuardian, "assets/GuardianDialogo.PNG");

  // ---------- Fondo (CSS var) ----------
  function setBackgroundAsset(assetPathExact){
    document.documentElement.style.setProperty('--bg-url', `url("${assetPathExact}")`);
  }

  // ---------- Banner de combate ----------
  function showBattleStart(){
    if (battleBanner){
      battleBanner.style.display = "flex";
      setTimeout(()=>{ battleBanner.style.display="none"; }, 2200);
    }
    if (battleSound){
      battleSound.currentTime = 0;
      battleSound.play().catch(()=>{});
    }
  }

  // ---------- Turn banner ----------
  function showTurnBanner(text){
    if (!turnBanner) return;
    turnBanner.textContent = text;
    turnBanner.style.display = "block";
    setTimeout(()=>{ turnBanner.style.display = "none"; }, 1200);
  }
  function setTurno(t){
    turno = t;
    showTurnBanner(t==="jugador" ? "TU TURNO" : t==="enemigo" ? "TURNO ENEMIGO" : "FIN DE PARTIDA");
  }

  // ---------- Layout tablero / orientación ----------
  function ajustarTamanoTablero(){
    const vw = Math.max(window.innerWidth || 0, document.documentElement.clientWidth || 0);
    const vh = Math.max(window.innerHeight || 0, document.documentElement.clientHeight || 0);
    const pad = 12;
    const cell = Math.max(28, Math.floor(Math.min((vw - pad)/COLS, (vh - pad)/ROWS)));
    document.documentElement.style.setProperty('--cell', `${cell}px`);
    document.documentElement.style.setProperty('--cols', COLS);
    document.documentElement.style.setProperty('--rows', ROWS);
    document.documentElement.style.setProperty('--npRows', NON_PLAYABLE_BOTTOM_ROWS);
    mapa.style.width  = `${cell * COLS}px`;
    mapa.style.height = `${cell * ROWS}px`;
  }
  function isPortrait(){ return window.innerHeight > window.innerWidth; }
  function applyOrientationLock(){
    const blocker = document.getElementById("orientationBlocker");
    const enVertical = isPortrait();
    const portadaVisible = portada && getComputedStyle(portada).display !== "none";
    const shouldBlock = enVertical && !portadaVisible;
    if (blocker) blocker.style.display = shouldBlock ? "grid" : "none";
    const dim = (el)=>{ if(!el) return; el.style.pointerEvents = shouldBlock ? "none" : "auto"; el.style.filter = shouldBlock ? "grayscale(1) blur(1.2px) brightness(.75)" : "none"; };
    dim(intro); dim(dialog); dim(mapa);
  }
  window.addEventListener('resize', ajustarTamanoTablero);
  window.addEventListener('orientationchange', ajustarTamanoTablero);
  window.addEventListener('resize', applyOrientationLock);
  window.addEventListener('orientationchange', ()=> setTimeout(applyOrientationLock, 100));

  // ---------- Utilidades de grid ----------
  const key        = (f,c)=>`${f},${c}`;
  const dentro     = (f,c)=>f>=0 && f<ROWS && c>=0 && c<COLS;
  const noJugable  = (f)=>f >= ROWS - NON_PLAYABLE_BOTTOM_ROWS;
  const manhattan  = (a,b)=>Math.abs(a.fila-b.fila)+Math.abs(a.col-b.col);
  const enLineaRecta = (a,b)=>(a.fila===b.fila) || (a.col===b.col);
  function getCelda(f,c){ return mapa.querySelector(`.celda[data-key="${f},${c}"]`); }

  // ---------- Retratos: posiciones base y especiales (fortaleza) ----------
  function resetDialogPortraitPositions(){
    if (charRisko){
      charRisko.classList.remove('left','flip','stack2');
      charRisko.classList.add('right');
      charRisko.style.opacity = ".9";
    }
    if (charHans){
      charHans.classList.remove('right','flip','stack2');
      charHans.classList.add('left');
      charHans.style.opacity = ".9";
    }
    if (charGuardian){
      charGuardian.style.display = "none";
      charGuardian.classList.remove('right','flip','stack2');
      charGuardian.classList.add('left');
      charGuardian.style.opacity = ".9";
    }
  }

  function applyFortressDialogLayout(){
    if (currentDialog !== dialogLinesFortaleza) return;
    if (!charRisko || !charHans || !charGuardian) return;

    const guardianHasAppeared = dlgIndex >= 2;
    if (guardianHasAppeared){
      // Guardián visible a la izquierda (principal oponente)
      charGuardian.style.display = "block";
      charGuardian.classList.remove('right','flip','stack2');
      charGuardian.classList.add('left');

      // Risko a la derecha normal
      charRisko.classList.remove('left','flip','stack2');
      charRisko.classList.add('right');

      // Hans se mueve con Risko a la derecha, SIN solaparse y volteado hacia Guardián
      charHans.classList.remove('left');
      charHans.classList.add('right','stack2','flip');
    } else {
      resetDialogPortraitPositions();
    }
  }

  // ---------- Diálogo: active speaker + typewriter ----------
  function setActiveSpeaker(){
    const line = currentDialog[dlgIndex];
    if (!line) return;
    [charRisko, charHans, charGuardian].forEach(el=>{ if(el){ el.classList.remove('speaking'); el.style.opacity=".6"; }});
    if (line.who==='risko'   && charRisko)   { charRisko.style.opacity='1';   charRisko.classList.add('speaking'); }
    if (line.who==='hans'    && charHans)    { charHans.style.opacity='1';    charHans.classList.add('speaking'); }
    if (line.who==='guardian'&& charGuardian){ charGuardian.style.opacity='1';charGuardian.classList.add('speaking'); }
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
        i++; typeTimer = setTimeout(step, speed);
      } else {
        typing = false;
        dialogTextEl.classList.remove('type-cursor');
      }
    }
    step();
  }

  function showCurrentDialog(){
    const line = currentDialog[dlgIndex];
    if (!line) return;
    applyFortressDialogLayout();
    setActiveSpeaker();
    clearTimeout(typeTimer);
    typeWriterDialog(line.text);
  }