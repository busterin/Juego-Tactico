(function(){
  // --- Dimensiones tablero 16x9 ---
  const ROWS = 9, COLS = 16;
  const NON_PLAYABLE_BOTTOM_ROWS = 2;

  const PLAYER_MAX_MP = 5;
  const ENEMY_MAX_MP  = 3;
  const ENEMY_BASE_DAMAGE = 50;

  let turno = "jugador";
  let fase = 1;
  let enemies = [];
  let players = [];
  let seleccionado = null;
  let celdasMovibles = new Set();
  let distSel = null;

  // --- Helper: tolerante a mayúsculas/minúsculas ---
  function loadImgCaseTolerant(imgEl, src){
    imgEl.src = src;
    imgEl.onerror = ()=>{
      if (src.endsWith('.PNG')) imgEl.src = src.replace(/\.PNG$/, '.png');
      else if (src.endsWith('.png')) imgEl.src = src.replace(/\.png$/, '.PNG');
      imgEl.onerror = null;
    };
  }

  // --- Diálogos ---
  const dialogLines = [
    { who:'knight', name:'Caballero', text:'Bienvenido a Tactic Heroes.' },
    { who:'archer', name:'Arquera',   text:'Selecciona un personaje para moverlo.' },
    { who:'knight', name:'Caballero', text:'El caballero ataca adyacente, la arquera a distancia.' },
    { who:'archer', name:'Arquera',   text:'¡Vamos al combate!' }
  ];
  let dlgIndex = 0;

  // --- Unidades ---
  const makeKnight = () => ({
    id:"K", tipo:"caballero",
    fila:5, col:4,
    vivo:true, nombre:"Caballero",
    hp:100, maxHp:100,
    retrato:"assets/player.PNG",
    damage:50, range:[1], acted:false, mp:PLAYER_MAX_MP
  });
  const makeArcher = () => ({
    id:"A", tipo:"arquera",
    fila:5, col:3,
    vivo:true, nombre:"Arquera",
    hp:80, maxHp:80,
    retrato:"assets/archer.PNG",
    damage:50, range:[2], acted:false, mp:PLAYER_MAX_MP
  });

  // --- DOM ---
  const mapa = document.getElementById("mapa");
  const acciones = document.getElementById("acciones");
  const ficha = document.getElementById("ficha");
  const overlayWin = document.getElementById("overlayWin");
  const btnContinuar = document.getElementById("btnContinuar");
  const portada = document.getElementById("portada");
  const btnJugar = document.getElementById("btnJugar");
  const dialog = document.getElementById("dialogScene");
  const dialogNameEl = document.getElementById("dialogName");
  const dialogTextEl = document.getElementById("dialogText");
  const btnDialogNext = document.getElementById("btnDialogNext");
  const charKnight = document.getElementById("charKnight");
  const charArcher = document.getElementById("charArcher");

  // Carga tolerante imágenes diálogo
  if (charKnight) loadImgCaseTolerant(charKnight, "assets/player.PNG");
  if (charArcher) loadImgCaseTolerant(charArcher, "assets/archer.PNG");

  // --- Funciones tablero (resumidas) ---
  function dibujarMapa(){
    mapa.innerHTML = "";
    for(let f=0;f<ROWS;f++){
      for(let c=0;c<COLS;c++){
        const celda=document.createElement("div");
        celda.className="celda";
        players.forEach(p=>{
          if(p.vivo && p.fila===f && p.col===c){
            const img=document.createElement("img");
            img.className="fichaMiniImg";
            loadImgCaseTolerant(img,(p.tipo==="caballero")?"assets/player.PNG":"assets/archer.PNG");
            celda.appendChild(img);
          }
        });
        enemies.forEach(e=>{
          if(e.vivo && e.fila===f && e.col===c){
            const img=document.createElement("img");
            img.className="fichaMiniImg";
            loadImgCaseTolerant(img,"assets/enemy.PNG");
            celda.appendChild(img);
          }
        });
        mapa.appendChild(celda);
      }
    }
  }

  // --- Init ---
  function init(){
    players=[makeKnight(),makeArcher()];
    enemies=[{id:"E1",fila:2,col:10,vivo:true,nombre:"Bandido",hp:50,maxHp:50,retrato:"assets/enemy.PNG"}];
    dibujarMapa();

    if (btnJugar){
      btnJugar.onclick=()=>{
        portada.style.display="none";
        dialog.style.display="block";
        dialogNameEl.textContent=dialogLines[0].name;
        dialogTextEl.textContent=dialogLines[0].text;
      };
    }
    if (btnDialogNext){
      btnDialogNext.onclick=()=>{
        dlgIndex++;
        if(dlgIndex>=dialogLines.length){
          dialog.style.display="none";
          mapa.style.display="grid";
        } else {
          dialogNameEl.textContent=dialogLines[dlgIndex].name;
          dialogTextEl.textContent=dialogLines[dlgIndex].text;
        }
      };
    }
    if (btnContinuar){
      btnContinuar.onclick=()=>location.reload();
    }
  }
  init();
})();
