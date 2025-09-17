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