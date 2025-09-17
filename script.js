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
    // ---------- Render tablero (incluye rejilla numerada con tecla G) ----------
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

        // Sprites jugadores
        for (const p of players){
          if (p.vivo && p.fila===f && p.col===c){
            const img = document.createElement("img");
            img.alt = p.nombre; img.className = "fichaMiniImg";
            loadImgCaseTolerant(img, (p.tipo==="caballero") ? "assets/player.PNG" : "assets/archer.PNG");
            celda.appendChild(img);
          }
        }
        // Sprites enemigos
        for (const e of enemies){
          if (e.vivo && e.fila===f && e.col===c){
            const img = document.createElement("img");
            img.alt = e.nombre; img.className = "fichaMiniImg";
            loadImgCaseTolerant(img, e.retrato || "assets/enemy.PNG");
            celda.appendChild(img);
          }
        }

        // Rejilla numerada (modo debug)
        if (mapa.classList.contains('debug')){
          const lab = document.createElement('span');
          lab.className = 'grid-label';
          lab.textContent = `${f},${c}`;
          celda.appendChild(lab);
        }

        celda.addEventListener("click", ()=>manejarClick(f,c));
        mapa.appendChild(celda);
      }
    }
  }

  // Toggle debug con 'G'
  document.addEventListener("keydown", (e)=>{
    if(e.key==="g" || e.key==="G"){
      mapa.classList.toggle("debug");
      dibujarMapa();
    }
  });

  // ---------- HUD ----------
  function botonesAccionesPara(u){
    acciones.innerHTML="";
    if (turno!=="jugador" || !u?.vivo) return;

    const infoMp = document.createElement("div");
    infoMp.style.cssText = "align-self:center;margin-right:6px;font-weight:700;color:#fff;";
    infoMp.textContent = `MP: ${u.mp}/${PLAYER_MAX_MP}`;
    acciones.appendChild(infoMp);

    enemigosEnRango(u).forEach(en=>{
      const b=document.createElement("button");
      b.className="primary";
      b.textContent=`ATACAR ${en.nombre}`;
      b.onclick=()=>atacarUnidadA(u,en);
      acciones.appendChild(b);
    });

    const bTurn=document.createElement("button");
    bTurn.textContent="Pasar turno";
    bTurn.onclick=endTurn;
    acciones.appendChild(bTurn);
  }

  function renderFicha(u){
    if(!u){ ficha.style.display="none"; ficha.innerHTML=""; return; }
    const pct = Math.max(0, Math.min(100, Math.round((u.hp/u.maxHp)*100)));
    const grad = (pct>50)?"linear-gradient(90deg,#2ecc71,#27ae60)":(pct>25)?"linear-gradient(90deg,#f1c40f,#e67e22)":"linear-gradient(90deg,#e74c3c,#c0392b)";
    const extra = `· Daño <b>${u.damage}</b> · KOs <b>${u.kills||0}</b> · MP <b>${u.mp}</b>/${PLAYER_MAX_MP}`;
    ficha.innerHTML = `
      <div class="card">
        <div class="portrait" style="background-image:url('${u.retrato||""}')"></div>
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

  // ---------- Combate ----------
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

      checkWaveOrWin();
      if (overlayWin && overlayWin.style.display === "grid") return;

      comprobarCambioATurnoEnemigo();
    }, 650);
  }

  function comprobarCambioATurnoEnemigo(){
    if (players.every(p => !p.vivo || p.acted || p.mp===0)) {
      setTurno("enemigo"); setTimeout(turnoIAEnemigos, 140);
    }
  }

  function turnoIAEnemigos(){
    if (turno !== "enemigo") return;
    const vivosJ = players.filter(p=>p.vivo);
    if (vivosJ.length === 0) { setTurno("fin"); return; }

    for (const en of enemies) {
      if (!en.vivo) continue;
      en.mp = typeof en.mpMax === 'number' ? en.mpMax : ENEMY_MAX_MP;

      // objetivo más cercano
      let objetivo = vivosJ[0];
      let mejor = manhattan(en, objetivo);
      for (const p of vivosJ){ const d = manhattan(en, p); if (d < mejor){ mejor = d; objetivo = p; } }

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

      const enemyDmg = (typeof en.damage === 'number') ? en.damage : ENEMY_BASE_DAMAGE;
      if (manhattan(en, objetivo) === 1 && isAlivePlayerByRef(objetivo)) {
        aplicarDanyo(objetivo, enemyDmg, 'enemy');
        renderFicha(objetivo);
      }
    }

    dibujarMapa();
    checkWaveOrWin();
    if (overlayWin && overlayWin.style.display === "grid") return;

    players.forEach(p=>{ if(p.hp<=0) p.vivo=false; p.acted=false; p.mp = PLAYER_MAX_MP; });
    setTurno("jugador");
  }
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
        nombre:`Soldado ${i+1 + (fase===2?3:0)}`,
        fila:f, col:c, vivo:true,
        hp:50, maxHp:50,
        retrato:"assets/enemy.PNG",
        damage:ENEMY_BASE_DAMAGE,
        mpMax: ENEMY_MAX_MP
      });
    }
    if (turno==="jugador") players.forEach(p=>{ p.acted=false; p.mp=PLAYER_MAX_MP; });
  }

  // ---------- Chequeos de victoria / oleadas ----------
  function checkWaveOrWin(){
    const anyEnemyAlive = enemies.some(e=>e.vivo);
    if (anyEnemyAlive) return;
    if (fase === 1){
      fase = 2;
      spawnFase();
      dibujarMapa();
      saveGame('auto');
      return;
    }
    if (fase === 2){
      setTurno("fin");
      if (overlayWin) overlayWin.style.display = "grid";
      saveGame('auto');
      return;
    }
  }

  // ---------- Escenas ----------
  const makeKnight = () => ({
    id:"K", tipo:"caballero", nombre:"Risko",
    fila: Math.floor(ROWS*0.55), col: Math.floor(COLS*0.25),
    vivo:true, hp:100, maxHp:100, retrato:"assets/player.PNG",
    nivel:1, kills:0, damage:50, range:[1], acted:false, mp:PLAYER_MAX_MP
  });
  const makeArcher = () => ({
    id:"A", tipo:"arquero", nombre:"Hans",
    fila: Math.floor(ROWS*0.55), col: Math.floor(COLS*0.20),
    vivo:true, hp:80, maxHp:80, retrato:"assets/archer.PNG",
    nivel:1, kills:0, damage:50, range:[2], acted:false, mp:PLAYER_MAX_MP
  });

  function startIntroDialog(){
    currentDialog = dialogLinesIntro;
    dlgIndex = 0;
    afterDialogAction = 'startTutorial';
    resetDialogPortraitPositions();
    dialog.style.display = "block";
    showCurrentDialog();
  }

  // Tutorial sencillo (mismo tablero/controles, sin gating duro para simplificar)
  function startTutorial(){
    setBackgroundAsset("assets/background.PNG");
    players=[makeKnight(), makeArcher()];
    fase=1; enemies=[]; seleccionado=null; celdasMovibles.clear(); distSel=null;
    mapa.style.display = "grid";
    if (portada) portada.style.display = "none";
    if (intro)   intro.style.display   = "none";
    if (dialog)  dialog.style.display  = "none";

    spawnFase();
    dibujarMapa();
    showBattleStart();
    setTurno("jugador");
    saveGame('auto');
  }

  function startBattleScene1(){
    // Por si se llama directo desde diálogos
    startTutorial();
  }

  function startScene2Dialog(){
    setBackgroundAsset("assets/Fortaleza.PNG");
    if (ficha){ ficha.style.display = "none"; ficha.innerHTML=""; }
    if (acciones){ acciones.innerHTML = ""; }
    if (mapa){ mapa.style.display = "none"; }

    currentDialog = dialogLinesFortaleza;
    afterDialogAction  = 'startBattleScene2';
    dlgIndex = 0;
    resetDialogPortraitPositions();
    dialog.style.display = "block";
    showCurrentDialog();
    saveGame('auto');
  }

  function startBattleScene2(){
    mapa.style.display = "grid";
    players = [ makeKnight(), makeArcher() ];
    enemies = [];
    seleccionado = null; celdasMovibles.clear(); distSel=null;

    // Oleada normal
    fase = 1;
    spawnFase();

    // Guardián (abajo del todo, centro aprox, lento y fuerte)
    const lastPlayableRow = ROWS - NON_PLAYABLE_BOTTOM_ROWS - 1; // 6
    const centerCol = Math.floor(COLS / 2); // 8
    enemies.push({
      id: `Guardian-${Date.now()}`,
      nombre: "Guardián",
      fila: lastPlayableRow,
      col: centerCol,
      vivo: true,
      hp: 200,
      maxHp: 200,
      retrato: "assets/Guardian.PNG",
      damage: 70,
      mpMax: 1
    });

    dibujarMapa();
    showBattleStart();
    setTurno("jugador");
    applyOrientationLock();
    saveGame('auto');
  }

  // ---------- Guardado / Carga ----------
  const SAVE_KEY = 'TH_SAVE_V1';
  function saveGame(mode='manual'){
    try{
      const save = {
        ts: Date.now(),
        fase, turno,
        players, enemies,
        intro: { index: introPageIndex },
        dialog: { which: (currentDialog===dialogLinesFortaleza?'fort':'intro'), index: dlgIndex },
        bg: getComputedStyle(document.documentElement).getPropertyValue('--bg-url')
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(save));
      if (mode==='manual'){ console.log('Guardado.'); }
    }catch(e){ console.error('Error guardando', e); }
  }
  function hasSave(){
    try { return !!localStorage.getItem(SAVE_KEY); } catch(e){ return false; }
  }
  function loadGame(){
    try{
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const save = JSON.parse(raw);

      fase  = save.fase ?? 1;
      turno = save.turno || 'jugador';
      players = (save.players||[]).map(o=>Object.assign({}, o));
      enemies = (save.enemies||[]).map(o=>Object.assign({}, o));

      const bg = (save.bg||'').trim();
      if (bg){
        // bg llega como: url("assets/Algo.PNG")
        document.documentElement.style.setProperty('--bg-url', bg);
      }

      // Restablecer UI base
      if (portada) portada.style.display = "none";
      if (intro) intro.style.display = "none";
      dialog.style.display = "none";
      mapa.style.display   = "grid";

      dibujarMapa();
      setTurno(turno);
      ajustarTamanoTablero();
      applyOrientationLock();
      return true;
    }catch(e){
      console.error('Error cargando', e);
      return false;
    }
  }

  // ---------- Portada: Nueva / Cargar ----------
  function newGame(){
    try{ localStorage.removeItem(SAVE_KEY); }catch(e){}
    if (portada) portada.style.display = "none";
    if (dialog)  dialog.style.display  = "none";
    if (intro){
      intro.style.display = "block";
      introPageIndex = 0;
      showIntroPage(introPageIndex);
    } else {
      // Fallback si no hubiera intro
      startIntroDialog();
    }
    applyOrientationLock();
    saveGame('auto');
  }

  // ---------- Intro NEXT ----------
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
        saveGame('auto');
      } else {
        if (intro) intro.style.display = "none";
        startIntroDialog();
        saveGame('auto');
      }
      applyOrientationLock();
    };
  }

  // ---------- Diálogo NEXT ----------
  if (btnDialogNext){
    btnDialogNext.onclick = ()=>{
      const line = currentDialog[dlgIndex];
      if (typing){
        clearTimeout(typeTimer);
        dialogTextEl.textContent = line.text;
        typing = false;
        dialogTextEl.classList.remove('type-cursor');
        return;
      }
      dlgIndex++;
      if (dlgIndex >= currentDialog.length){
        dialog.style.display = "none";
        if (afterDialogAction === 'startTutorial') startTutorial();
        else if (afterDialogAction === 'startBattleScene2') startBattleScene2();
        applyOrientationLock();
        return;
      }
      showCurrentDialog();
    };
  }

  // ---------- Victoria → diálogo fortaleza ----------
  if (btnContinuar){
    btnContinuar.onclick = () => {
      overlayWin.style.display = "none";
      startScene2Dialog();
    };
  }

  // ---------- Fin de turno jugador ----------
  function endTurn(){
    players.forEach(p=>{ p.acted=true; p.mp=0; });
    seleccionado=null; celdasMovibles.clear(); distSel=null;
    acciones.innerHTML="";
    setTurno("enemigo");
    setTimeout(turnoIAEnemigos, 140);
  }

  // ---------- Botones portada (triple seguro) ----------
  function wireMenuButtons(){
    if (btnNueva){
      btnNueva.onclick = ()=> newGame();
    }
    if (btnCargar){
      btnCargar.onclick = ()=>{
        if (!hasSave()) { alert("No hay partida guardada."); return; }
        loadGame();
      };
    }
    // Seguridad extra por si el HTML usa otros IDs
    window.TH_newGame  = ()=> newGame();
    window.TH_loadGame = ()=> loadGame();
    document.addEventListener('click', (ev)=>{
      const np = ev.target.closest('#btnNuevaPartida,#btnNueva');
      const cp = ev.target.closest('#btnCargarPartida,#btnCargar');
      if (np){ ev.preventDefault(); newGame(); }
      if (cp){ ev.preventDefault(); if (!hasSave()) alert("No hay partida guardada."); else loadGame(); }
    });
  }

  // ---------- INIT ----------
  function init(){
    // Estado base UI
    if (portada){
      portada.style.display = "flex";
      if (btnCargar) btnCargar.disabled = !hasSave();
    }
    if (intro)   intro.style.display   = "none";
    if (dialog)  dialog.style.display  = "none";
    if (mapa)    mapa.style.display    = "none";

    ajustarTamanoTablero();
    applyOrientationLock();
    wireMenuButtons();

    // Pre-carga sprites para primer dibujado si quisieras (opcional)
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();