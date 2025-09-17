(function(){
  const ROWS = 9, COLS = 16;
  const NON_PLAYABLE_BOTTOM_ROWS = 2;
  const PLAYER_MAX_MP = 5;
  const ENEMY_BASE_DAMAGE = 50;

  let turno="jugador", fase=1;
  let enemies=[], players=[];
  let seleccionado=null, celdasMovibles=new Set(), distSel=null;

  const mapa=document.getElementById("mapa");
  const btnGuardar=document.getElementById("btnGuardar");

  function loadImgCaseTolerant(imgEl, src){
    imgEl.src=src;
    imgEl.onerror=()=>{
      if(src.endsWith('.PNG')) imgEl.src=src.replace(/\.PNG$/,'.png');
      else if(src.endsWith('.png')) imgEl.src=src.replace(/\.png$/,'.PNG');
      imgEl.onerror=null;
    };
  }

  // ---------- Rejilla ----------
  function dibujarMapa(){
    mapa.querySelectorAll(".celda").forEach(n=>n.remove());
    for(let f=0; f<ROWS; f++){
      for(let c=0; c<COLS; c++){
        const celda=document.createElement("div");
        celda.className="celda";
        celda.dataset.key=`${f},${c}`;

        // sprites jugadores
        for(const p of players){
          if(p.vivo && p.fila===f && p.col===c){
            const img=document.createElement("img");
            img.alt=p.nombre; img.className="fichaMiniImg";
            loadImgCaseTolerant(img,(p.tipo==="caballero")?"assets/player.PNG":"assets/archer.PNG");
            celda.appendChild(img);
          }
        }
        // sprites enemigos
        for(const e of enemies){
          if(e.vivo && e.fila===f && e.col===c){
            const img=document.createElement("img");
            img.alt=e.nombre; img.className="fichaMiniImg";
            loadImgCaseTolerant(img,e.retrato||"assets/enemy.PNG");
            celda.appendChild(img);
          }
        }

        // 🔹 etiqueta de coordenadas
        if(mapa.classList.contains('debug')){
          const lab=document.createElement("span");
          lab.className="grid-label";
          lab.textContent=`${f},${c}`;
          celda.appendChild(lab);
        }

        mapa.appendChild(celda);
      }
    }
  }

  // ---------- Debug tecla G ----------
  document.addEventListener("keydown", (e)=>{
    if(e.key==="g"||e.key==="G"){
      mapa.classList.toggle("debug");
      dibujarMapa();
    }
  });

  // ---------- Guardar ----------
  function saveGame(){
    const save={players,enemies,fase,turno};
    localStorage.setItem("tactic-heroes-save",JSON.stringify(save));
    alert("Partida guardada.");
  }
  if(btnGuardar){
    btnGuardar.style.display="block";
    btnGuardar.onclick=saveGame;
  }

  // --- init básico para probar ---
  function init(){
    players=[
      {id:"K",tipo:"caballero",fila:7,col:4,vivo:true,nombre:"Risko"},
      {id:"A",tipo:"arquera",fila:7,col:6,vivo:true,nombre:"Hans"}
    ];
    enemies=[
      {id:"E1",fila:2,col:8,vivo:true,nombre:"Soldado",retratos:"assets/enemy.PNG"}
    ];
    dibujarMapa();
  }
  init();
})();