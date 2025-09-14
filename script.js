/* build: landscape-16x9 · Intro x2 + typewriter · Diálogo Risko/Hans · HUD abajo · Battle banner+drum · PNG tolerant */
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
  const dialogLines = [
    { who:'knight', name:'Risko', text:'Llevamos días huyendo y aún nos persiguen esos dichosos soldados.' },
    { who:'archer', name:'Hans',  text:'Han matado al Rey y te han acusado a ti, además ni siquiera sabemos quien fue...' },
    { who:'knight', name:'Risko', text:'Tengo mis sospechas pero ninguna prueba. Eres el único miembro de la Guardia que me queda, Hans.' },
    { who:'archer', name:'Hans',  text:'Te seguiré siempre, capitana. De momento sólo podemos huir, y prepárate porque ahí vienen de nuevo.' }
  ];
  let dlgIndex = 0, typing=false, typeTimer=null, speakPopTimer=null;

  function clearPop(){ [charKnight, charArcher].forEach(el=>el && el.classList.remove('pop','speaking')); }
  function setActiveSpeaker(){
    clearTimeout(speakPopTimer);
    const line = dialogLines[dlgIndex];
    if (!line) return;

    if (charKnight && charArcher){
      charKnight.style.opacity = '.6';
      charArcher.style.opacity = '.6';
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
    const line = dialogLines[dlgIndex];
    if (!line) return;
    setActiveSpeaker();
    clearTimeout(typeTimer);
    typeWriterDialog(line.text);
  }

  // --- Banner inicio + sonido (simple, sin cambios al fondo) ---
  const battleBanner = document.getElementById("battleStartBanner");
  const battleSound  = document.getElementById("battleStartSound");
  function showBattleStart(){
    if (battleBanner){
      battleBanner.style.display = "block";
      setTimeout(()=>{ battleBanner.style.display="none"; }, 2500);
    }
    if (battleSound){
      battleSound.currentTime = 0;
      battleSound.play().catch(()=>{});
    }
  }

  function advanceDialog(){
    if (!dialog) return;
    const line = dialogLines[dlgIndex];
    if (typing){
      clearTimeout(typeTimer);
      dialogTextEl.textContent = line.text;
      typing = false;
      dialogTextEl.classList.remove('type-cursor');
      return;
    }
    dlgIndex++;
    clearPop();
    if (dlgIndex >= dialogLines.length){
      dialog.style.display = "none";
      mapa.style.display = "grid";

      // Mostrar banner de inicio de combate + tambor
      showBattleStart();

      setTurno("jugador");
      applyOrientationLock();
      return;
    }
    showCurrentDialog();
  }

  // Unidades del jugador (Risko / Hans)
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
  function showTurnBanner(text){
    turnBanner.textContent = text;
    turnBanner.style.display = "block";
    setTimeout(()=>{ turnBanner.style.display = "none"; }, 1300);
  }
  function setTurno(t){
    turno = t;
    showTurnBanner(t==="jugador" ? "TU TURNO" : t==="enemigo" ? "TURNO ENEMIGO" : "FIN DE PARTIDA");
  }

  // ---------- Layout / tamaño celda ----------
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

  // ---------- Bloqueo de orientación (bloquea vertical) ----------
  function isPortrait(){ return window.innerHeight > window.innerWidth; }
  function applyOrientationLock(){
    const blocker = document.getElementById("orientationBlocker");
    const enVertical = isPortrait();

    const portadaVisible = portada && getComputedStyle(portada).display !== "none";
    const shouldBlock = enVertical && !portadaVisible;

    blocker.style.display = shouldBlock ? "grid" : "none";

    if (portada){ portada.style.pointerEvents = "auto"; portada.style.filter = "none"; }

    // Dimear intro, diálogo y mapa (portada siempre clicable)
    const dim = (el)=>{
      if(!el) return;
      el.style.pointerEvents = shouldBlock ? "none" : "auto";
      el.style.filter = shouldBlock ? "grayscale(1) blur(1.5px) brightness(.7)" : "none";
    };
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
        if (seleccionado && celdasMovibles.has(key(f,c))) celda.classList.add("movible");
        if (seleccionado && seleccionado.fila===f && seleccionado.col===c) celda.classList.add("seleccionada");

        for (const p of players){
          if (p.vivo && p.fila===f && p.col===c){
            const img = document.createElement("img");
            img.alt = p.nombre;
            img.className = "fichaMiniImg";
            loadImgCaseTolerant(img, (p.tipo==="caballero") ? "assets/player.PNG" : "assets/archer.PNG");
            celda.appendChild(img);
          }
        }
        for (const e of enemies){
          if (e.vivo && e.fila===f && e.col===c){
            const img = document.createElement("img");
            img.alt = e.nombre;
            img.className = "fichaMiniImg";
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

    if (pj){
      if (pj.acted){
        seleccionado=null; celdasMovibles.clear(); distSel=null; dibujarMapa(); acciones.innerHTML="";
        return;
      }
      seleccionado=pj;
      if (seleccionado.mp>0) calcularCeldasMovibles(seleccionado);
      else { celdasMovibles.clear(); distSel=null; }
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
        if (seleccionado.mp>0){ calcularCeldasMovibles(seleccionado); }
        else { celdasMovibles.clear(); distSel=null; }
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
      if(!objetivo.vivo){
        u.kills=(u.kills||0)+1;
        if (enemies.every(e=>!e.vivo)) {
          if (fase === 1){ fase = 2; spawnFase(); dibujarMapa(); }
          else if (fase === 2){ fase = 3; setTurno("fin"); overlayWin.style.display="grid"; }
        }
      }
      u.acted = true; u.mp = 0;
      seleccionado = null; celdasMovibles.clear(); distSel=null;
      acciones.innerHTML="";
      dibujarMapa();
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
    if (turno !== "enemigo") return;
    const vivosJ = players.filter(p=>p.vivo);
    if (vivosJ.length === 0) { setTurno("fin"); return; }

    for (const en of enemies) {
      if (!en.vivo) continue;
      en.mp = ENEMY_MAX_MP;

      // objetivo más cercano (Manhattan)
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

  // ---------- Init (portada → intro×2 → diálogo → juego) ----------
  function init(){
    players=[makeKnight(),makeArcher()];
    ajustarTamanoTablero(); spawnFase(); dibujarMapa();
    if (btnContinuar) btnContinuar.onclick=()=>{ overlayWin.style.display="none"; location.reload(); };

    // Estado inicial
    if (portada) portada.style.display = "flex";
    if (intro)   intro.style.display   = "none";
    if (dialog)  dialog.style.display  = "none";
    if (mapa)    mapa.style.display    = "none";

    // Botón JUGAR → Intro página 1
    if (btnJugar){
      btnJugar.onclick = ()=>{
        portada.style.display = "none";
        if (intro){
          intro.style.display = "block";
          introPageIndex = 0;
          showIntroPage(introPageIndex);
        } else if (dialog){
          dlgIndex = 0; dialog.style.display = "block"; showCurrentDialog();
        } else {
          mapa.style.display = "grid"; setTurno("jugador");
        }
        applyOrientationLock();
      };
    }

    // Botón CONTINUAR de la intro
    if (btnIntroNext){
      btnIntroNext.onclick = ()=>{
        const page = INTRO_PAGES[introPageIndex];
        if (introTyping){
          // Completar texto de golpe
          clearTimeout(introTypeTimer);
          introTextEl.textContent = page.text;
          introTextEl.classList.remove('type-cursor');
          introTyping = false;
          return;
        }
        // Siguiente página o pasar a diálogo
        if (introPageIndex < INTRO_PAGES.length - 1){
          introPageIndex++;
          showIntroPage(introPageIndex);
        } else {
          if (intro) intro.style.display = "none";
          if (dialog){
            dlgIndex = 0;
            dialog.style.display = "block";
            showCurrentDialog();
          } else {
            mapa.style.display = "grid";
            setTurno("jugador");
          }
        }
        applyOrientationLock();
      };
    }

    // Botón CONTINUAR del diálogo
    if (btnDialogNext) btnDialogNext.onclick = advanceDialog;

    // Rejilla de coordenadas (debug) con tecla G
    document.addEventListener("keydown", (e)=>{
      if(e.key==="g" || e.key==="G"){
        mapa.classList.toggle("debug");
      }
    });

    setupOrientationLock();
  }
  init();
})();