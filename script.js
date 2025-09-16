/* build: tutorial Risko+Hans · landscape 16x9 · intro x2 · diálogo · banner combate+drum · PNG tolerant · Escena 2 (Fortaleza) */
(function(){
  // --- Dimensiones tablero 16×9 ---
  const ROWS = 9, COLS = 16;
  const NON_PLAYABLE_BOTTOM_ROWS = 2;

  // Parámetros combate
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

  // Tutorial
  let tutorial = {
    active: false,
    step: 0,
    enemyR: null,  // enemigo para Risko (adyacente tras mover)
    enemyH: null,  // enemigo para Hans (rango 2)
    targetMoveR: {f:6, c:4},
    targetMoveH: {f:6, c:3}
  };

  // --- Helper: tolerante a .PNG/.png ---
  function loadImgCaseTolerant(imgEl, src){
    imgEl.src = src;
    imgEl.onerror = ()=>{
      if (src.endsWith('.PNG')) imgEl.src = src.replace(/\.PNG$/, '.png');
      else if (src.endsWith('.png')) imgEl.src = src.replace(/\.png$/, '.PNG');
      imgEl.onerror = null;
    };
  }

  // --- Helper: cambiar fondo (afecta body, diálogos, overlays que usan --bg-url) ---
  function setBackgroundAsset(assetPathExact){
    // Usa la ruta EXACTA (p.ej. assets/Fortaleza.PNG)
    document.documentElement.style.setProperty('--bg-url', `url("${assetPathExact}")`);
  }

  // ---------- Intro ----------
  const INTRO_PAGES = [
    { img: "assets/Inicio1.PNG",
      text: "El reino de Orbis era un lugar de paz, donde hacía mucho que la espada y la magia no se usaban en combate y sus amables gentes disfrutaban de la vida." },
    { img: "assets/Inicio2.PNG",
      text: "Pero todo cambió cuando el Rey Ardiem fue traicionado y su fiel capitana de la Guardia, obligada a huir…" }
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

  // ---------- Diálogo (motor reutilizable) ----------
  const dialogLines = [
    { who:'knight', name:'Risko', text:'Llevamos días huyendo y aún nos persiguen esos dichosos soldados.' },
    { who:'archer', name:'Hans',  text:'Han matado al Rey y te han acusado a ti, además ni siquiera sabemos quien fue...' },
    { who:'knight', name:'Risko', text:'Tengo mis sospechas pero ninguna prueba. Eres el único miembro de la Guardia que me queda, Hans.' },
    { who:'archer', name:'Hans',  text:'Te seguiré siempre, capitana. De momento sólo podemos huir, y prepárate porque ahí vienen de nuevo.' }
  ];

  // Diálogo post-victoria (copiamos el que nos diste)
  const postBattleDialogLines = [
    { who:'archer', name:'Hans',  text:'Lo hemos conseguido, capitana.' },
    { who:'knight', name:'Risko', text:'Sí, pero es demasiado pronto para cantar victoria. Están por todas partes, ocultémonos en la fortaleza.' }
  ];

  // Reutilización de motor
  let currentDialogLines = dialogLines;
  let afterDialogAction = 'startTutorial'; // 'startTutorial' | 'startBattleScene2'

  let dlgIndex = 0, typing=false, typeTimer=null, speakPopTimer=null;

  function clearPop(){ [charKnight, charArcher].forEach(el=>el && el.classList.remove('pop','speaking')); }
  function setActiveSpeaker(){
    clearTimeout(speakPopTimer);
    const line = currentDialogLines[dlgIndex];
    if (!line) return;
    if (charKnight && charArcher){
      charKnight.style.opacity = '.6'; charArcher.style.opacity = '.6';
      if (line.who === 'knight'){ charKnight.style.opacity='1'; charKnight.classList.add('speaking'); }
      else { charArcher.style.opacity='1'; charArcher.classList.add('speaking'); }
      speakPopTimer = setTimeout(()=>{
        if (line.who === 'knight'){ charKnight.classList.add('pop'); }
        else { charArcher.classList.add('pop'); }
      }, 500);
    }
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
      } else { typing = false; dialogTextEl.classList.remove('type-cursor'); }
    }
    step();
  }
  function showCurrentDialog(){ const line = currentDialogLines[dlgIndex]; if(!line) return; setActiveSpeaker(); clearTimeout(typeTimer); typeWriterDialog(line.text); }

  // --- Banner inicio + sonido ---
  const battleBanner = document.getElementById("battleStartBanner");
  const battleSound  = document.getElementById("battleStartSound");
  function showBattleStart(){
    if (battleBanner){ battleBanner.style.display = "block"; setTimeout(()=>{ battleBanner.style.display="none"; }, 2500); }
    if (battleSound){ battleSound.currentTime = 0; battleSound.play().catch(()=>{}); }
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
    dlgIndex++; clearPop();
    if (dlgIndex >= currentDialogLines.length){
      dialog.style.display = "none";

      // 👉 ¿Qué toca tras este diálogo?
      if (afterDialogAction === 'startTutorial'){
        startTutorial();
      } else if (afterDialogAction === 'startBattleScene2'){
        startBattleScene2();
      }
      applyOrientationLock();
      return;
    }
    showCurrentDialog();
  }

  // Unidades del jugador (por defecto, fuera del tutorial)
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
  const charKnight = document.getElementById("charKnight"); // Risko (derecha)
  const charArcher = document.getElementById("charArcher"); // Hans (izquierda)

  // Carga de imágenes de diálogo
  if (charKnight) loadImgCaseTolerant(charKnight, "assets/GuerreraDialogo.PNG");
  if (charArcher) loadImgCaseTolerant(charArcher, "assets/ArqueroDialogo.PNG");

  // ---------- Banner turno ----------
  function showTurnBanner(text){ turnBanner.textContent = text; turnBanner.style.display = "block"; setTimeout(()=>{ turnBanner.style.display = "none"; }, 1300); }
  function setTurno(t){ turno = t; showTurnBanner(t==="jugador" ? "TU TURNO" : t==="enemigo" ? "TURNO ENEMIGO" : "FIN DE PARTIDA"); }

  // ---------- Layout ----------
  function getUsableViewport(){
    const w = Math.max(window.innerWidth || 0, document.documentElement.clientWidth || 0);
    const h = Math.max(window.innerHeight || 0, document.documentElement.clientHeight || 0);
    return { w, h };
  }
  function ajustarTamanoTablero(){
    const { w:vw, h:vh } = getUsableViewport();
    const pad = 12;
    const cell = Math.max(28, Math.floor(Math.min((vw - pad)/COLS, (vh - pad)/ROWS)));
    document.documentElement.style.setProperty('--cell', `${cell}px`);
    document.documentElement.style.setProperty('--cols', COLS);
    document.documentElement.style.setProperty('--rows', ROWS);
    document.documentElement.style.setProperty('--npRows', NON_PLAYABLE_BOTTOM_ROWS);
    mapa.style.width  = `${cell * COLS}px`;
    mapa.style.height = `${cell * ROWS}px`;
  }
  window.addEventListener('resize', ajustarTamanoTablero);
  window.addEventListener('orientationchange', ajustarTamanoTablero);
  new ResizeObserver(()=>ajustarTamanoTablero()).observe(document.body);

  // ---------- Bloqueo orientación ----------
  function isPortrait(){ return window.innerHeight > window.innerWidth; }
  function applyOrientationLock(){
    const blocker = document.getElementById("orientationBlocker");
    const enVertical = isPortrait();
    const portadaVisible = portada && getComputedStyle(portada).display !== "none";
    const shouldBlock = enVertical && !portadaVisible;
    blocker.style.display = shouldBlock ? "grid" : "none";
    if (portada){ portada.style.pointerEvents = "auto"; portada.style.filter = "none"; }
    const dim = (el)=>{ if(!el) return; el.style.pointerEvents = shouldBlock ? "none" : "auto"; el.style.filter = shouldBlock ? "grayscale(1) blur(1.5px) brightness(.7)" : "none"; };
    dim(intro); dim(dialog); dim(mapa);
  }
  function setupOrientationLock(){
    applyOrientationLock();
    window.addEventListener("resize", applyOrientationLock);
    window.addEventListener("orientationchange", ()=> setTimeout(applyOrientationLock,100));
  }

  // ---------- Utils ----------
  const key = (f,c) => `${f},${c}`;
  const dentro = (f,c) => f>=0 && f<ROWS && c>=0 && c<COLS;
  const noJugable = (f) => f >= ROWS - NON_PLAYABLE_BOTTOM_ROWS;
  const manhattan = (a,b) => Math.abs(a.fila-b.fila)+Math.abs(a.col-b.col);
  const enLineaRecta = (a,b) => (a.fila===b.fila) || (a.col===b.col);
  function getCelda(f,c){ return mapa.querySelector(`.celda[data-key="${f},${c}"]`); }

  // ---------- Oleadas ----------
  function spawnFase(){
    enemies = [];
    const count = (fase === 1) ? 3 : (fase === 2) ? 4 : 0;
    if (count === 0) return;
    const ocupadas = new Set(players.filter(p=>p.vivo).map(p=>key(p.fila,p.col)));
    for (let i=0; i<count; i++){
      let f,c;
      do {
        f = Math.floor(Math.random()*(ROWS - NON_PLAYABLE_BOTTOM_ROWS));
        c = Math.floor(Math.random()*COLS);
      } while (ocupadas.has(key(f,c)));
      ocupadas.add(key(f,c));
      enemies.push({
        id:`E${Date.now()}-${i}`,
        nombre:`Bandido ${i+1 + (fase===2?3:0)}`,
        fila:f, col:c, vivo:true,
        hp:50, maxHp:50,
        retrato:"assets/enemy.PNG",
        damage:ENEMY_BASE_DAMAGE,
        mp: ENEMY_MAX_MP
      });
    }
    if (turno==="jugador") players.forEach(p=>{ p.acted=false; p.mp=PLAYER_MAX_MP; });
  }

  // ---------- Render ----------
  function dibujarMapa(){
    mapa.querySelectorAll(".celda").forEach(n=>n.remove());
    for (let f=0; f<ROWS; f++){
      for (let c=0; c<COLS; c++){
        const celda = document.createElement("div");
        celda.className = "celda";
        celda.dataset.key = key(f,c);
        if (noJugable(f)) celda.style.pointerEvents = "none";

        // tutorial: marca celda objetivo
        if (tutorial.active){
          const t = tutorial.step;
          if (t === 1){
            if (f===tutorial.targetMoveR.f && c===tutorial.targetMoveR.c) celda.classList.add("tut-target");
          } else if (t === 4){
            if (f===tutorial.targetMoveH.f && c===tutorial.targetMoveH.c) celda.classList.add("tut-target");
          }
        }

        if (seleccionado && celdasMovibles.has(key(f,c))) celda.classList.add("movible");
        if (seleccionado && seleccionado.fila===f && seleccionado.col===c) celda.classList.add("seleccionada");

        for (const p of players){
          if (p.vivo && p.fila===f && p.col===c){
            const img = document.createElement("img");
            img.alt = p.nombre; img.className = "fichaMiniImg";
            loadImgCaseTolerant(img, (p.tipo==="caballero") ? "assets/player.PNG" : "assets/archer.PNG");
            celda.appendChild(img);
          }
        }
        for (const e of enemies){
          if (e.vivo && e.fila===f && e.col===c){
            const img = document.createElement("img");
            img.alt = e.nombre; img.className = "fichaMiniImg";
            loadImgCaseTolerant(img, "assets/enemy.PNG");
            celda.appendChild(img);
          }
        }

        celda.addEventListener("click", ()=>manejarClick(f,c));
        mapa.appendChild(celda);
      }
    }
  }

  // ---------- HUD / acciones ----------
  function endTurn(){
    players.forEach(p=>{ p.acted=true; p.mp=0; });
    seleccionado=null; celdasMovibles.clear(); distSel=null;
    acciones.innerHTML="";
    setTurno("enemigo");
    setTimeout(turnoIAEnemigos, 140);
  }

  function botonesAccionesPara(unidad){
    acciones.innerHTML="";
    if (turno!=="jugador" || !unidad?.vivo) return;

    const infoMp = document.createElement("div");
    infoMp.textContent = `MP: ${unidad.mp}/${PLAYER_MAX_MP}`;
    infoMp.style.marginRight = "6px";
    infoMp.style.alignSelf = "center";
    acciones.appendChild(infoMp);

    // Tutorial: restringe ataque/turno según paso
    if (tutorial.active){
      const t = tutorial.step;
      if (t === 2){ // Ataque de Risko al enemigo R adyacente
        const en = tutorial.enemyR && enemies.find(e=>e.id===tutorial.enemyR.id && e.vivo);
        if (en && stillInRange(unidad, en)){
          const b=document.createElement("button");
          b.className="primary"; b.textContent=`ATACAR ${en.nombre}`;
          b.onclick=()=>atacarUnidadA(unidad,en);
          acciones.appendChild(b);
        }
      } else if (t === 5){ // Ataque de Hans a distancia 2
        const en = tutorial.enemyH && enemies.find(e=>e.id===tutorial.enemyH.id && e.vivo);
        if (en && stillInRange(unidad, en)){
          const b=document.createElement("button");
          b.className="primary"; b.textContent=`ATACAR ${en.nombre}`;
          b.onclick=()=>atacarUnidadA(unidad,en);
          acciones.appendChild(b);
        }
      }

      if (t === 6){
        const bTurn=document.createElement("button");
        bTurn.textContent="Pasar turno";
        bTurn.onclick=()=>finishTutorialAndStartBattle();
        acciones.appendChild(bTurn);
      }
      return; // no añadir más botones durante tutorial
    }

    // Combate normal (fuera del tutorial)
    enemigosEnRango(unidad).forEach(en=>{
      const b=document.createElement("button");
      b.className="primary";
      b.textContent=`ATACAR ${en.nombre}`;
      b.onclick=()=>atacarUnidadA(unidad,en);
      acciones.appendChild(b);
    });
    const bTurn=document.createElement("button");
    bTurn.textContent="Pasar turno";
    bTurn.onclick=endTurn;
    acciones.appendChild(bTurn);
  }

  // ---------- Ficha ----------
  function renderFicha(u){
    if(!u){ ficha.style.display="none"; ficha.innerHTML=""; return; }
    const pct = Math.max(0, Math.min(100, Math.round((u.hp/u.maxHp)*100)));
    const grad = (pct>50)?"linear-gradient(90deg,#2ecc71,#27ae60)":(pct>25)?"linear-gradient(90deg,#f1c40f,#e67e22)":"linear-gradient(90deg,#e74c3c,#c0392b)";
    const extra = `· Daño <b>${u.damage}</b> · KOs <b>${u.kills}</b> · MP <b>${u.mp}</b>/${PLAYER_MAX_MP}`;
    ficha.innerHTML = `
      <div class="card">
        <div class="portrait" style="background-image:url('${u.retrato}')"></div>
        <div class="info">
          <p class="name">${u.nombre}</p>
          <p class="meta">${extra}</p>
          <div class="hp">
            <div class="bar"><span style="width:${pct}%; background:${grad}"></span></div>
            <div class="value">${u.hp}/${u.maxHp} HP</div>
          </div>
        </div>
      </div>`;
    ficha.style.display="block";
  }

  // ---------- Movimiento ----------
  function calcularCeldasMovibles(u){
    celdasMovibles.clear();
    distSel = Array.from({length:ROWS},()=>Array(COLS).fill(Infinity));
    const q=[]; distSel[u.fila][u.col]=0; q.push([u.fila,u.col]);
    const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
    while(q.length){
      const [f,c]=q.shift();
      for(const [df,dc] of dirs){
        const nf=f+df,nc=c+dc;
        if(!dentro(nf,nc) || noJugable(nf)) continue;
        const ocupado = enemies.some(e=>e.vivo&&e.fila===nf&&e.col===nc) ||
                        players.some(p=>p.vivo&&p!==u&&p.fila===nf&&p.col===nc);
        if(ocupado) continue;
        const nd = distSel[f][c] + 1;
        if(nd<=u.mp && nd<distSel[nf][nc]){ distSel[nf][nc]=nd; q.push([nf,nc]); }
      }
    }
    for(let f=0;f<ROWS-NON_PLAYABLE_BOTTOM_ROWS;f++) for(let c=0;c<COLS;c++){
      if(!(f===u.fila && c===u.col) && distSel[f][c]<=u.mp) celdasMovibles.add(`${f},${c}`);
    }
  }

  function enemigosEnRango(u){
    return enemies.filter(e=>{
      if(!e.vivo) return false;
      if(!enLineaRecta(u,e)) return false;
      const d = Math.abs(u.fila-e.fila)+Math.abs(u.col-e.col);
      return (u.range || []).includes(d);
    });
  }

  // ---------- Clicks ----------
  function manejarClick(f,c){
    if (noJugable(f)) return;

    const pj = players.find(p=>p.vivo&&p.fila===f&&p.col===c);
    const en = enemies.find(e=>e.vivo&&e.fila===f&&e.col===c);
    if(pj) renderFicha(pj); else if(en) renderFicha(en);

    if (turno!=="jugador") return;

    // --- Tutorial gating ---
    if (tutorial.active){
      const t = tutorial.step;

      // Paso 0: seleccionar Risko
      if (t === 0){
        const risko = players.find(p=>p.nombre==="Risko" && p.vivo);
        if (pj === risko){
          seleccionado = pj; if (seleccionado.mp>0) calcularCeldasMovibles(seleccionado);
          botonesAccionesPara(seleccionado);
          setTutText("Mueve a Risko a la casilla resaltada.");
          tutorial.step = 1; dibujarMapa();
        }
        return;
      }

      // Paso 1: mover Risko a (6,4)
      if (t === 1){
        if (!seleccionado || seleccionado.nombre!=="Risko"){ return; }
        const esAlcanzable = celdasMovibles.has(`${f},${c}`);
        const esObjetivo = (f===tutorial.targetMoveR.f && c===tutorial.targetMoveR.c);
        if (esAlcanzable && esObjetivo){
          const coste = distSel[f][c] || 0;
          seleccionado.fila=f; seleccionado.col=c;
          seleccionado.mp = Math.max(0, seleccionado.mp - coste);
          renderFicha(seleccionado);
          celdasMovibles.clear(); distSel=null;
          dibujarMapa();
          setTutText("Ataca al bandido adyacente.");
          tutorial.step = 2;
          botonesAccionesPara(seleccionado);
        }
        return;
      }

      // Paso 2: atacar con Risko (botón HUD)
      if (t === 2){ return; }

      // Paso 3: seleccionar Hans
      if (t === 3){
        const hans = players.find(p=>p.nombre==="Hans" && p.vivo);
        if (pj === hans){
          seleccionado = pj; if (seleccionado.mp>0) calcularCeldasMovibles(seleccionado);
          botonesAccionesPara(seleccionado);
          setTutText("Mueve a Hans a la casilla resaltada.");
          tutorial.step = 4; dibujarMapa();
        }
        return;
      }

      // Paso 4: mover Hans a (6,3)
      if (t === 4){
        if (!seleccionado || seleccionado.nombre!=="Hans"){ return; }
        const esAlcanzable = celdasMovibles.has(`${f},${c}`);
        const esObjetivo = (f===tutorial.targetMoveH.f && c===tutorial.targetMoveH.c);
        if (esAlcanzable && esObjetivo){
          const coste = distSel[f][c] || 0;
          seleccionado.fila=f; seleccionado.col=c;
          seleccionado.mp = Math.max(0, seleccionado.mp - coste);
          renderFicha(seleccionado);
          celdasMovibles.clear(); distSel=null;
          dibujarMapa();
          setTutText("Ataca a distancia al bandido (rango 2).");
          tutorial.step = 5;
          botonesAccionesPara(seleccionado);
        }
        return;
      }

      // Paso 5: atacar con Hans (botón HUD)
      if (t === 5){ return; }

      // Paso 6: pasar turno → fin tutorial
      if (t === 6){ return; }

      return;
    }

    // --- Flujo normal (sin tutorial) ---
    if (pj){
      if (pj.acted){
        seleccionado=null; celdasMovibles.clear(); distSel=null; dibujarMapa(); acciones.innerHTML="";
        return;
      }
      seleccionado=pj;
      if (seleccionado.mp>0) calcularCeldasMovibles(seleccionado); else { celdasMovibles.clear(); distSel=null; }
      dibujarMapa(); botonesAccionesPara(seleccionado);
      return;
    }

    if (seleccionado){
      if (f===seleccionado.fila && c===seleccionado.col){
        seleccionado=null; celdasMovibles.clear(); distSel=null; dibujarMapa(); acciones.innerHTML=""; return;
      }
      const esAlcanzable = celdasMovibles.has(`${f},${c}`);
      const ocupado = enemies.some(e=>e.vivo&&e.fila===f&&e.col===c) ||
                      players.some(p=>p.vivo&&p!==seleccionado&&p.fila===f&&p.col===c);
      if (esAlcanzable && !ocupado){
        const coste = distSel[f][c] || 0;
        seleccionado.fila=f; seleccionado.col=c;
        seleccionado.mp = Math.max(0, seleccionado.mp - coste);
        renderFicha(seleccionado);
        if (seleccionado.mp>0){ calcularCeldasMovibles(seleccionado); } else { celdasMovibles.clear(); distSel=null; }
        dibujarMapa(); botonesAccionesPara(seleccionado);
      } else {
        botonesAccionesPara(seleccionado);
      }
    }
  }

  // ---------- FX ----------
  function efectoAtaque(objetivo, cantidad, fuente){
    const celda = getCelda(objetivo.fila, objetivo.col);
    if(!celda) return;
    const flash = (fuente==='enemy')?'flash-enemy':'flash-player';
    celda.classList.add(flash); setTimeout(()=>celda.classList.remove(flash),280);
    const sprite = celda.querySelector('.fichaMiniImg');
    if (sprite){ sprite.classList.add('blink-hit'); setTimeout(()=>sprite.classList.remove('blink-hit'),600); }
    const dmg=document.createElement('div');
    dmg.className='dmg-float ' + (fuente==='enemy'?'dmg-enemy':'dmg-player');
    dmg.textContent=`-${cantidad}`; celda.appendChild(dmg);
    setTimeout(()=>dmg.remove(),650);
  }
  function efectoMuerte(unidad){
    const celda = getCelda(unidad.fila, unidad.col);
    if(!celda) return;
    const sprite = celda.querySelector('.fichaMiniImg');
    if (sprite){ sprite.classList.add('death-pop'); setTimeout(()=>{ if(sprite.parentNode) sprite.parentNode.removeChild(sprite); }, 360); }
  }
  function aplicarDanyo(obj,cant,fuente){
    obj.hp=Math.max(0,obj.hp-cant);
    efectoAtaque(obj,cant,fuente);
    mapa.classList.add("shake");
    setTimeout(()=>mapa.classList.remove("shake"), 400);
    if(obj.hp<=0){ obj.vivo=false; efectoMuerte(obj); }
  }

  // ---------- Validación / combate ----------
  function isAliveEnemyById(id){ return enemies.find(e=>e.id===id && e.vivo); }
  function isAlivePlayerByRef(p){ return players.includes(p) && p.vivo; }
  function stillInRange(attacker, target){
    if (!target?.vivo) return false;
    if (!enLineaRecta(attacker, target)) return false;
    const d = Math.abs(attacker.fila - target.fila) + Math.abs(attacker.col - target.col);
    return (attacker.range || []).includes(d);
  }

  function atacarUnidadA(u, objetivoRef){
    const objetivo = isAliveEnemyById(objetivoRef.id);
    if (!objetivo || !stillInRange(u, objetivo)) { botonesAccionesPara(u); return; }
    aplicarDanyo(objetivo, u.damage, 'player');
    renderFicha(objetivo);
    setTimeout(()=>{
      if(!objetivo.vivo){ u.kills=(u.kills||0)+1; }
      u.acted = true; u.mp = 0;
      seleccionado = null; celdasMovibles.clear(); distSel=null;
      acciones.innerHTML="";
      dibujarMapa();

      // Avances de tutorial tras cada ataque
      if (tutorial.active){
        if (tutorial.step === 2){ // Risko atacó
          setTutText("Ahora selecciona a Hans.");
          tutorial.step = 3;
        } else if (tutorial.step === 5){ // Hans atacó
          setTutText("Pulsa 'Pasar turno' para comenzar el combate real.");
          tutorial.step = 6;
          const hans = players.find(p=>p.nombre==="Hans" && p.vivo);
          seleccionado = hans; botonesAccionesPara(hans);
        }
        return;
      }

      comprobarCambioATurnoEnemigo();
    }, 650);
  }

  function comprobarCambioATurnoEnemigo(){
    if (players.every(p => !p.vivo || p.acted || p.mp===0)) {
      setTurno("enemigo"); setTimeout(turnoIAEnemigos, 140);
    }
  }

  // ---------- IA Enemiga ----------
  function turnoIAEnemigos(){
    // No hay IA durante el tutorial
    if (tutorial.active) return;

    if (turno !== "enemigo") return;
    const vivosJ = players.filter(p=>p.vivo);
    if (vivosJ.length === 0) { setTurno("fin"); return; }

    for (const en of enemies) {
      if (!en.vivo) continue;
      en.mp = ENEMY_MAX_MP;

      // objetivo más cercano
      let objetivo = vivosJ[0];
      let mejor = manhattan(en, objetivo);
      for (const p of vivosJ){ const d = manhattan(en, p); if (d < mejor){ mejor = d; objetivo = p; } }

      // moverse hasta 3 pasos
      const step = (a,b)=> a<b?1:(a>b?-1:0);
      while (en.mp > 0){
        if (manhattan(en, objetivo) === 1) break;
        const cand = [];
        if (en.fila !== objetivo.fila) cand.push([en.fila + step(en.fila, objetivo.fila), en.col]);
        if (en.col  !== objetivo.col ) cand.push([en.fila, en.col + step(en.col,  objetivo.col )]);
        let moved = false;
        for (const [nf,nc] of cand){
          if(!dentro(nf,nc) || noJugable(nf)) continue;
          const ocupado = enemies.some(o=>o!==en && o.vivo && o.fila===nf && o.col===nc) ||
                          players.some(p=>p.vivo && p.fila===nf && p.col===nc);
          if(!ocupado){ en.fila=nf; en.col=nc; en.mp--; moved=true; break; }
        }
        if(!moved) break;
      }

      if (manhattan(en, objetivo) === 1 && isAlivePlayerByRef(objetivo)) {
        aplicarDanyo(objetivo, ENEMY_BASE_DAMAGE, 'enemy');
        renderFicha(objetivo);
      }
    }

    players.forEach(p=>{ if(p.hp<=0) p.vivo=false; p.acted=false; p.mp = PLAYER_MAX_MP; });
    dibujarMapa();

    if (players.every(p=>!p.vivo)) { setTurno("fin"); }
    else {
      setTurno("jugador");
      if (enemies.every(e=>!e.vivo)) {
        if (fase === 1){ fase = 2; spawnFase(); dibujarMapa(); }
        else if (fase === 2){ fase = 3; overlayWin.style.display="grid"; }
      }
    }
  }

  // ---------- Tutorial: helpers ----------
  const tutOverlay = document.getElementById("tutorialOverlay");
  const tutTextEl  = document.getElementById("tutText");
  function setTutText(t){ if(tutTextEl){ tutTextEl.textContent = t; } }
  function showTut(b){ if(tutOverlay){ tutOverlay.style.display = b ? "block" : "none"; } }

  function startTutorial(){
    // Asegura fondo inicial (background.PNG) por si venimos de otra escena
    setBackgroundAsset("assets/background.PNG");

    // Setup determinista de posiciones
    players = [
      { id:"K", tipo:"caballero", fila:6, col:3, vivo:true, nombre:"Risko", hp:100, maxHp:100, retrato:"assets/player.PNG", nivel:1, kills:0, damage:50, range:[1], acted:false, mp:PLAYER_MAX_MP },
      { id:"A", tipo:"arquera",  fila:6, col:2, vivo:true, nombre:"Hans",  hp: 80, maxHp: 80, retrato:"assets/archer.PNG", nivel:1, kills:0, damage:50, range:[2], acted:false, mp:PLAYER_MAX_MP }
    ];
    enemies = [];
    tutorial.enemyR = { id:"TR", nombre:"Bandido R", fila:6, col:5, vivo:true, hp:50, maxHp:50, retrato:"assets/enemy.PNG", damage:ENEMY_BASE_DAMAGE, mp:ENEMY_MAX_MP };
    tutorial.enemyH = { id:"TH", nombre:"Bandido H", fila:4, col:3, vivo:true, hp:50, maxHp:50, retrato:"assets/enemy.PNG", damage:ENEMY_BASE_DAMAGE, mp:ENEMY_MAX_MP };
    enemies.push(tutorial.enemyR, tutorial.enemyH);

    seleccionado = null; celdasMovibles.clear(); distSel=null;
    tutorial.active = true; tutorial.step = 0;

    mapa.style.display = "grid";
    setTurno("jugador");
    showTut(true);
    setTutText("Primero, selecciona a Risko.");
    ajustarTamanoTablero(); dibujarMapa(); applyOrientationLock();
  }

  function finishTutorialAndStartBattle(){
    tutorial.active = false;
    players.forEach(p=>{ p.acted=false; p.mp=PLAYER_MAX_MP; });
    fase = 1;
    spawnFase();
    dibujarMapa();
    showTut(false);
    showBattleStart();
    setTurno("jugador");
  }

  // ---------- Escena 2: Fortaleza ----------
  function startScene2Dialog(){
    // Cambiamos el fondo a la Fortaleza (mayúsculas como indicaste)
    setBackgroundAsset("assets/Fortaleza.PNG");

    // Preparamos diálogo (copiado)
    currentDialogLines = postBattleDialogLines;
    afterDialogAction = 'startBattleScene2';
    dlgIndex = 0;

    // Mostramos escena de diálogo
    if (dialog){
      dialog.style.display = "block";
      showCurrentDialog();
    }
  }

  function startBattleScene2(){
    // Reset estado de combate para nueva escena (sin tutorial)
    tutorial.active = false;
    fase = 1;
    players = [ makeKnight(), makeArcher() ];
    enemies = [];
    seleccionado = null; celdasMovibles.clear(); distSel=null;

    // Mostramos tablero y arrancamos combate normal
    mapa.style.display = "grid";
    spawnFase();
    dibujarMapa();
    showBattleStart();
    setTurno("jugador");
    applyOrientationLock();
  }

  // ---------- Init ----------
  function init(){
    players=[makeKnight(),makeArcher()];
    ajustarTamanoTablero(); spawnFase(); dibujarMapa();

    // Botón Continuar (victoria) → pasar a Escena 2 (Fortaleza → diálogo → combate)
    if (btnContinuar) btnContinuar.onclick = () => {
      overlayWin.style.display = "none";
      // Arrancamos la escena 2: cambia fondo y abre diálogo copiado
      startScene2Dialog();
    };

    // Estado inicial
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
        } else if (dialog){
          currentDialogLines = dialogLines;
          afterDialogAction = 'startTutorial';
          dlgIndex = 0; dialog.style.display = "block"; showCurrentDialog();
        } else {
          startTutorial();
        }
        applyOrientationLock();
      };
    }

    if (btnIntroNext){
      btnIntroNext.onclick = ()=>{
        const page = INTRO_PAGES[introPageIndex];
        if (introTyping){ clearTimeout(introTypeTimer); introTextEl.textContent = page.text; introTextEl.classList.remove('type-cursor'); introTyping = false; return; }
        if (introPageIndex < INTRO_PAGES.length - 1){
          introPageIndex++; showIntroPage(introPageIndex);
        } else {
          if (intro) intro.style.display = "none";
          if (dialog){
            currentDialogLines = dialogLines;
            afterDialogAction = 'startTutorial';
            dlgIndex = 0; dialog.style.display = "block"; showCurrentDialog();
          } else {
            startTutorial();
          }
        }
        applyOrientationLock();
      };
    }

    if (btnDialogNext) btnDialogNext.onclick = advanceDialog;

    // Rejilla debug
    document.addEventListener("keydown", (e)=>{ if(e.key==="g"||e.key==="G"){ mapa.classList.toggle("debug"); } });

    setupOrientationLock();
  }
  init();
})();