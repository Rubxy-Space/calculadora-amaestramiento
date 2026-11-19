/* Interfaz de la calculadora de amaestramiento. El cálculo vive en motor.js. */
(function () {
  'use strict';

  var Motor = window.Motor;
  var CLAVE = 'sbc-amaestramiento-v2';
  var $ = function (s, r) { return (r || document).querySelector(s); };

  var ICONO_BORRAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/></svg>';
  var ICONO_CERRADO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
  var ICONO_ABIERTO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.6-1.8"/></svg>';

  /* ---------- Estado ---------- */

  /* Plantillas de cilindro. Solo se incluyen datos comprobados con su ficha. */
  var PLANTILLAS = {
    generico: {
      etiqueta: 'Genérico (6 pitones, 6 alturas)',
      sistema: {
        nombre: 'Cilindro de 6 pitones',
        posiciones: 6,
        alturas: 6,
        profundidades: [],
        espaciado: '',
        stop: '',
        pastillas: [{ mm: null, saltos: 2 }, { mm: null, saltos: 4 }],
        minDifMaestra: 2,
        minDifLlaves: 2
      }
    },
    securemmeK1: {
      etiqueta: 'Securemme K1 (ficha Silca)',
      sistema: {
        nombre: 'Securemme K1',
        posiciones: 6,
        alturas: 6,
        profundidades: [268, 223, 178, 133, 88, 43],
        espaciado: 330,
        stop: 0,
        pastillas: [{ mm: 0.9, saltos: 2 }, { mm: 1.8, saltos: 4 }],
        minDifMaestra: 2,
        minDifLlaves: 2
      }
    }
  };

  function plantilla(id) {
    var s = JSON.parse(JSON.stringify(PLANTILLAS[id].sistema));
    s.plantilla = id;
    return s;
  }

  var TIPOS = {
    doble: { etiqueta: 'Doble', lados: 2 },
    pomo: { etiqueta: 'Con pomo', lados: 1 },
    simple: { etiqueta: 'Simple', lados: 1 }
  };

  function planEjemplo() {
    return {
      version: 2,
      obra: 'Nave industrial (ejemplo)',
      referencia: '',
      notas: '',
      copiasMaestra: 2,
      sistema: plantilla('generico'),
      maestra: [3, 5, 2, 6, 1, 4],
      cilindros: [
        { id: 'c1', nombre: 'Portilla verja', medida: '30/30', tipo: 'doble' },
        { id: 'c2', nombre: 'Peatonal portón 1', medida: '30/30', tipo: 'doble' },
        { id: 'c3', nombre: 'Peatonal portón 2', medida: '30/30', tipo: 'doble' },
        { id: 'c4', nombre: 'Peatonal almacén', medida: '30/40', tipo: 'doble' },
        { id: 'c5', nombre: 'Entrada oficinas', medida: '35/55', tipo: 'doble' },
        { id: 'c6', nombre: 'Oficina 1', medida: '30/30', tipo: 'doble' },
        { id: 'c7', nombre: 'Oficina 2', medida: '30/30', tipo: 'doble' }
      ],
      llaves: [
        { id: 'k1', nombre: 'Taller', copias: 3, abre: ['c1', 'c2', 'c3', 'c4'], codigo: null, fijo: false },
        { id: 'k2', nombre: 'Instaladores', copias: 3, abre: ['c1', 'c2', 'c3'], codigo: null, fijo: false },
        { id: 'k3', nombre: 'Oficinas', copias: 3, abre: ['c2', 'c5'], codigo: null, fijo: false },
        { id: 'k4', nombre: 'Antena', copias: 1, abre: ['c1'], codigo: null, fijo: false },
        { id: 'k5', nombre: 'Portón 2', copias: 2, abre: ['c3'], codigo: null, fijo: false }
      ],
      semilla: 1
    };
  }

  /* Plan en blanco para rellenar desde cero. */
  function planVacio(sistema) {
    var s = sistema ? JSON.parse(JSON.stringify(sistema)) : plantilla('generico');
    var maestra = [];
    for (var i = 0; i < s.posiciones; i++) maestra.push(null);
    return {
      version: 2,
      obra: '',
      referencia: '',
      notas: '',
      copiasMaestra: '',
      sistema: s,
      maestra: maestra,
      cilindros: [{ id: nuevoId('c'), nombre: '', medida: '', tipo: 'doble' }],
      llaves: [],
      semilla: 1
    };
  }

  /* Completa planes guardados con versiones anteriores. */
  function completarEstado(e) {
    ['obra', 'referencia', 'notas'].forEach(function (k) { if (typeof e[k] !== 'string') e[k] = ''; });
    if (e.copiasMaestra == null) e.copiasMaestra = '';
    if (!e.sistema.plantilla) e.sistema.plantilla = 'personalizado';
    e.cilindros.forEach(function (c) {
      if (!TIPOS[c.tipo]) c.tipo = Number(c.lados) === 1 ? 'simple' : 'doble';
      if (c.medida == null) c.medida = '';
    });
    e.llaves.forEach(function (k) {
      if (k.copias == null) k.copias = '';
      if (!Array.isArray(k.abre)) k.abre = [];
    });
    return e;
  }

  function nuevoId(prefijo) {
    return prefijo + Date.now().toString(36) + Math.floor(Math.random() * 46656).toString(36);
  }

  function estadoValido(e) {
    return e && e.sistema && Array.isArray(e.maestra) && Array.isArray(e.cilindros) && Array.isArray(e.llaves) &&
      Array.isArray(e.sistema.profundidades) && Array.isArray(e.sistema.pastillas);
  }

  function cargar() {
    try {
      var t = localStorage.getItem(CLAVE);
      if (!t) return null;
      var e = JSON.parse(t);
      return estadoValido(e) ? completarEstado(e) : null;
    } catch (err) { return null; }
  }

  function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify(estado)); } catch (err) { /* sin almacenamiento: no pasa nada */ }
  }

  var estado = cargar() || planVacio();

  /* ---------- Utilidades ---------- */

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function mm(v) { return Number(v).toFixed(2).replace('.', ','); }
  function tieneMm(p) { return p.mm != null && p.mm !== '' && Number(p.mm) > 0; }
  function nombrePastilla(p) {
    return tieneMm(p) ? mm(p.mm) + ' mm' : 'de ' + p.saltos + (p.saltos === 1 ? ' altura' : ' alturas');
  }
  function tieneProf() {
    return estado.sistema.profundidades.some(function (v) { return v !== '' && v != null; });
  }
  function resumenSistema() {
    var s = estado.sistema;
    return s.nombre + ' · ' + s.posiciones + ' posiciones · alturas 1 a ' + s.alturas + ' · pastillas ' +
      s.pastillas.map(function (p) { return tieneMm(p) ? mm(p.mm) + ' mm' : p.saltos + ' alt.'; }).join(' y ');
  }
  function codigoCil(i) { return 'C' + (i + 1); }
  function maestraCompleta() { return Motor.codigoValido(estado.maestra, estado.sistema.posiciones, estado.sistema.alturas); }
  function hayCodigos() { return estado.llaves.some(function (k) { return Array.isArray(k.codigo) && k.codigo.some(Boolean); }); }
  function plural(n, uno, varios) { return n + ' ' + (n === 1 ? uno : varios); }

  function datosMotor() {
    var mapa = {};
    estado.cilindros.forEach(function (c, i) { mapa[c.id] = codigoCil(i); });
    return {
      sistema: estado.sistema,
      maestra: estado.maestra,
      cilindros: estado.cilindros.map(function (c, i) {
        var tipo = TIPOS[c.tipo] || TIPOS.doble;
        return { id: codigoCil(i), nombre: c.nombre || 'Sin nombre', medida: c.medida || '', tipo: tipo.etiqueta, lados: tipo.lados };
      }),
      llaves: estado.llaves.map(function (k) {
        return {
          id: k.id, nombre: k.nombre || 'Sin nombre',
          abre: k.abre.map(function (id) { return mapa[id]; }).filter(Boolean),
          codigo: k.codigo, fijo: !!k.fijo
        };
      })
    };
  }

  /* Vuelve a pintar sin perder el foco del campo en el que se escribe. */
  function conFoco(fn) {
    var activo = document.activeElement;
    var clave = activo && activo.getAttribute && activo.getAttribute('data-foco');
    var sel = null;
    try { if (clave && activo.selectionStart != null) sel = [activo.selectionStart, activo.selectionEnd]; } catch (err) { sel = null; }
    fn();
    if (clave) {
      var n = document.querySelector('[data-foco="' + clave + '"]');
      if (n) {
        n.focus();
        try { if (sel) n.setSelectionRange(sel[0], sel[1]); } catch (err) { /* campo sin selección */ }
      }
    }
  }

  function enfocar(clave) {
    var n = document.querySelector('[data-foco="' + clave + '"]');
    if (n) { n.focus(); if (n.select) n.select(); }
  }

  /* ---------- Cálculo ---------- */

  var temporizador = null;
  function programarCalculo() {
    clearTimeout(temporizador);
    temporizador = setTimeout(calcular, 350);
  }

  function mensaje(texto, esError) {
    var m = $('#mensaje-calculo');
    m.textContent = texto;
    m.classList.toggle('es-error', !!esError);
  }

  function calcular() {
    clearTimeout(temporizador);
    if (!maestraCompleta()) {
      mensaje('Completa la llave maestra: ' + estado.sistema.posiciones + ' alturas entre 1 y ' + estado.sistema.alturas + '.', true);
      pintarResultado();
      return;
    }
    if (!estado.llaves.length) {
      mensaje('Añade al menos una llave al plan para calcular.', false);
      pintarResultado();
      return;
    }
    var r = Motor.generar(datosMotor(), { semilla: estado.semilla || 1 });
    if (!r.ok) {
      mensaje(r.motivo, true);
    } else {
      estado.llaves.forEach(function (k) {
        if (r.codigos[k.id]) k.codigo = r.codigos[k.id].slice();
      });
      var fijadas = estado.llaves.filter(function (k) { return k.fijo; }).length;
      mensaje('Propuesta ' + (estado.semilla || 1) + ' calculada.' +
        (fijadas ? ' Se respetan ' + plural(fijadas, 'llave fijada', 'llaves fijadas') + '.' : ''), false);
    }
    guardar();
    pintarResultado();
  }

  /* ---------- Llave maestra ---------- */

  function pintarMaestra() {
    var s = estado.sistema, P = s.posiciones, H = s.alturas;
    var cont = $('#maestra-entradas');
    cont.style.setProperty('--posiciones', P);
    var conProf = tieneProf();
    var html = '';
    for (var i = 0; i < P; i++) {
      var v = estado.maestra[i];
      var ok = Number.isInteger(v) && v >= 1 && v <= H;
      var prof = ok ? s.profundidades[v - 1] : null;
      var vacia = v == null;
      html += '<div class="maestra-pos">' +
        '<label for="m' + i + '">P' + (i + 1) + '</label>' +
        '<input id="m' + i + '" data-foco="m' + i + '" data-m="' + i + '" inputmode="numeric" autocomplete="off" ' +
        'maxlength="' + String(H).length + '" value="' + (ok ? v : '') + '"' +
        (conProf ? ' aria-describedby="mp' + i + '"' : '') + (ok || vacia ? '' : ' aria-invalid="true"') + '>' +
        '<div class="maestra-barra" aria-hidden="true"><span style="height:' + (ok ? (v / H * 100) : 0) + '%"></span></div>' +
        (conProf ? '<span class="maestra-prof" id="mp' + i + '">' + (prof != null && prof !== '' ? 'prof. ' + esc(prof) : '·') + '</span>' : '') +
        '</div>';
    }
    cont.innerHTML = html;
    actualizarMaestra();
  }

  /* Actualiza barras, profundidades y código sin sustituir las casillas (no se pierden pulsaciones). */
  function actualizarMaestra() {
    var s = estado.sistema, H = s.alturas;
    for (var i = 0; i < s.posiciones; i++) {
      var inp = document.getElementById('m' + i);
      if (!inp) continue;
      var v = estado.maestra[i];
      var ok = Number.isInteger(v) && v >= 1 && v <= H;
      if (inp.value !== (ok ? String(v) : '') && !(document.activeElement === inp && inp.value === '')) inp.value = ok ? v : '';
      var barra = inp.parentNode.querySelector('.maestra-barra span');
      if (barra) barra.style.height = (ok ? v / H * 100 : 0) + '%';
      var prof = document.getElementById('mp' + i);
      if (prof) {
        var pv = ok ? s.profundidades[v - 1] : null;
        prof.textContent = pv != null && pv !== '' ? 'prof. ' + pv : '·';
      }
    }
    $('#maestra-codigo').textContent = maestraCompleta() ? estado.maestra.join('-') : 'Sin completar';
    $('#maestra-sistema').textContent = resumenSistema();
  }

  $('#btn-reset-maestra').addEventListener('click', function () {
    var P = estado.sistema.posiciones;
    estado.maestra = [];
    for (var i = 0; i < P; i++) estado.maestra.push(null);
    // Los códigos dependían de la maestra anterior: se descartan todos
    estado.llaves.forEach(function (k) { k.codigo = null; k.fijo = false; });
    guardar();
    pintarMaestra();
    pintarResultado();
    mensaje('Llave maestra borrada. Escribe la nueva y se recalcula sola.', false);
    enfocar('m0');
  });

  $('#enlace-sistema').addEventListener('click', function (e) {
    e.preventDefault();
    var d = $('#sistema');
    d.open = true;
    d.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  });

  function ponerMaestra(i, texto) {
    var H = estado.sistema.alturas;
    var n = parseInt(String(texto).replace(/\D/g, ''), 10);
    estado.maestra[i] = (n >= 1 && n <= H) ? n : null;
    return estado.maestra[i] != null;
  }

  $('#maestra-entradas').addEventListener('input', function (e) {
    var el = e.target.closest('[data-m]');
    if (!el) return;
    var i = Number(el.getAttribute('data-m'));
    var ok = ponerMaestra(i, el.value);
    if (!ok && el.value !== '') el.value = '';
    guardar();
    actualizarMaestra();
    if (ok && el.value.length >= String(estado.sistema.alturas).length && i < estado.sistema.posiciones - 1) enfocar('m' + (i + 1));
    if (maestraCompleta()) programarCalculo(); else pintarResultado();
  });

  $('#maestra-entradas').addEventListener('keydown', function (e) {
    var el = e.target.closest('[data-m]');
    if (!el) return;
    var i = Number(el.getAttribute('data-m'));
    if (e.key === 'Backspace' && el.value === '' && i > 0) { e.preventDefault(); enfocar('m' + (i - 1)); }
    if (e.key === 'ArrowLeft' && i > 0) { e.preventDefault(); enfocar('m' + (i - 1)); }
    if (e.key === 'ArrowRight' && i < estado.sistema.posiciones - 1) { e.preventDefault(); enfocar('m' + (i + 1)); }
  });

  $('#maestra-entradas').addEventListener('paste', function (e) {
    var el = e.target.closest('[data-m]');
    if (!el) return;
    var texto = (e.clipboardData || window.clipboardData).getData('text');
    var trozos = estado.sistema.alturas >= 10 ? texto.split(/\D+/).filter(Boolean) : texto.replace(/\D/g, '').split('');
    if (trozos.length < 2) return;
    e.preventDefault();
    var inicio = trozos.length >= estado.sistema.posiciones ? 0 : Number(el.getAttribute('data-m'));
    trozos.slice(0, estado.sistema.posiciones - inicio).forEach(function (t, j) { ponerMaestra(inicio + j, t); });
    guardar();
    pintarMaestra();
    if (maestraCompleta()) calcular(); else pintarResultado();
  });

  /* ---------- Plan de cierre ---------- */

  function pintarCilindros() {
    var html = estado.cilindros.map(function (c, i) {
      var cod = codigoCil(i);
      return '<tr>' +
        '<td><span class="codigo-cil">' + cod + '</span></td>' +
        '<td><input type="text" data-foco="cn-' + c.id + '" data-cil="' + c.id + '" data-campo="nombre" value="' + esc(c.nombre) + '" placeholder="Nombre de la puerta" aria-label="Puerta del cilindro ' + cod + '"></td>' +
        '<td><input type="text" data-foco="cm-' + c.id + '" data-cil="' + c.id + '" data-campo="medida" value="' + esc(c.medida) + '" placeholder="30/30" aria-label="Medida del cilindro ' + cod + '"></td>' +
        '<td><select data-foco="cl-' + c.id + '" data-cil="' + c.id + '" data-campo="tipo" aria-label="Tipo del cilindro ' + cod + '">' +
          Object.keys(TIPOS).map(function (t) {
            return '<option value="' + t + '"' + (c.tipo === t ? ' selected' : '') + '>' + TIPOS[t].etiqueta + '</option>';
          }).join('') +
        '</select></td>' +
        '<td><button type="button" class="boton-icono" data-quitar-cil="' + c.id + '" aria-label="Quitar el cilindro ' + cod + '">' + ICONO_BORRAR + '</button></td>' +
        '</tr>';
    }).join('');
    $('#cuerpo-cilindros').innerHTML = html || '<tr><td colspan="5" class="vacio">Añade el primer cilindro.</td></tr>';
  }

  function casilla(marcada, atributos, etiqueta, deshabilitada) {
    return '<label class="casilla"><input type="checkbox"' + (marcada ? ' checked' : '') + (deshabilitada ? ' disabled' : '') +
      ' ' + atributos + ' aria-label="' + esc(etiqueta) + '"><span></span></label>';
  }

  function pintarAccesos() {
    var cab = '<thead><tr><th scope="col">Llave</th><th scope="col" class="col-copias">Copias</th>' + estado.cilindros.map(function (c, i) {
      return '<th scope="col" class="cil" title="' + esc(c.nombre) + '">' + codigoCil(i) + '</th>';
    }).join('') + '<th scope="col"><span class="oculto">Quitar</span></th></tr></thead>';

    var maestra = '<tr class="fila-maestra"><td class="nombre-maestra">Maestra</td>' +
      '<td class="col-copias"><input type="text" inputmode="numeric" data-foco="copias-maestra" data-copias="__maestra" value="' + esc(estado.copiasMaestra) + '" placeholder="0" aria-label="Copias de la llave maestra"></td>' +
      estado.cilindros.map(function (c, i) {
      return '<td class="marca-celda">' + casilla(true, '', 'La maestra abre ' + codigoCil(i), true) + '</td>';
    }).join('') + '<td></td></tr>';

    var filas = estado.llaves.map(function (k) {
      var nombre = k.nombre || 'llave sin nombre';
      return '<tr><td><input type="text" data-foco="kn-' + k.id + '" data-llave="' + k.id + '" data-campo="nombre" value="' + esc(k.nombre) + '" placeholder="Nombre de la llave" aria-label="Nombre de la llave"></td>' +
        '<td class="col-copias"><input type="text" inputmode="numeric" data-foco="kk-' + k.id + '" data-copias="' + k.id + '" value="' + esc(k.copias) + '" placeholder="0" aria-label="Copias de la llave ' + esc(nombre) + '"></td>' +
        estado.cilindros.map(function (c, i) {
          return '<td class="marca-celda">' + casilla(k.abre.indexOf(c.id) !== -1,
            'data-foco="ka-' + k.id + '-' + c.id + '" data-acceso="' + k.id + '" data-cil="' + c.id + '"',
            nombre + ' abre ' + codigoCil(i) + ' ' + (c.nombre || '')) + '</td>';
        }).join('') +
        '<td><button type="button" class="boton-icono" data-quitar-llave="' + k.id + '" aria-label="Quitar la llave ' + esc(nombre) + '">' + ICONO_BORRAR + '</button></td></tr>';
    }).join('');

    var vacio = estado.llaves.length ? '' :
      '<tr><td colspan="' + (estado.cilindros.length + 3) + '" class="vacio">Añade la primera llave y marca los cilindros que abre.</td></tr>';
    $('#tabla-accesos').innerHTML = cab + '<tbody>' + maestra + filas + vacio + '</tbody>';
  }

  var temporizadorNombres = null;
  function nombresCambiados() {
    clearTimeout(temporizadorNombres);
    temporizadorNombres = setTimeout(function () { pintarResultado(); pintarAccesosSiHaceFalta(); }, 300);
  }
  function pintarAccesosSiHaceFalta() {
    // Los títulos de las columnas llevan el nombre de la puerta
    var ths = document.querySelectorAll('#tabla-accesos th.cil');
    estado.cilindros.forEach(function (c, i) { if (ths[i]) ths[i].title = c.nombre || ''; });
  }

  $('#cuerpo-cilindros').addEventListener('input', function (e) {
    var el = e.target.closest('[data-cil][data-campo]');
    if (!el) return;
    var c = estado.cilindros.find(function (x) { return x.id === el.getAttribute('data-cil'); });
    if (!c) return;
    var campo = el.getAttribute('data-campo');
    c[campo] = el.value;
    guardar();
    nombresCambiados();
  });

  $('#cuerpo-cilindros').addEventListener('click', function (e) {
    var b = e.target.closest('[data-quitar-cil]');
    if (!b) return;
    var id = b.getAttribute('data-quitar-cil');
    estado.cilindros = estado.cilindros.filter(function (c) { return c.id !== id; });
    estado.llaves.forEach(function (k) { k.abre = k.abre.filter(function (x) { return x !== id; }); });
    guardar();
    pintarPlan();
    programarCalculo();
  });

  $('#tabla-accesos').addEventListener('input', function (e) {
    var cop = e.target.closest('[data-copias]');
    if (cop) {
      var valor = cop.value.replace(/\D/g, '').slice(0, 3);
      var id = cop.getAttribute('data-copias');
      if (id === '__maestra') estado.copiasMaestra = valor;
      else {
        var kc = estado.llaves.find(function (x) { return x.id === id; });
        if (kc) kc.copias = valor;
      }
      guardar();
      return;
    }
    var el = e.target.closest('[data-llave][data-campo]');
    if (!el) return;
    var k = estado.llaves.find(function (x) { return x.id === el.getAttribute('data-llave'); });
    if (!k) return;
    k.nombre = el.value;
    guardar();
    nombresCambiados();
  });

  $('#tabla-accesos').addEventListener('change', function (e) {
    var el = e.target.closest('[data-acceso]');
    if (!el) return;
    var k = estado.llaves.find(function (x) { return x.id === el.getAttribute('data-acceso'); });
    var cid = el.getAttribute('data-cil');
    if (!k) return;
    if (el.checked) { if (k.abre.indexOf(cid) === -1) k.abre.push(cid); }
    else k.abre = k.abre.filter(function (x) { return x !== cid; });
    guardar();
    pintarResultado();
    programarCalculo();
  });

  $('#tabla-accesos').addEventListener('click', function (e) {
    var b = e.target.closest('[data-quitar-llave]');
    if (!b) return;
    var id = b.getAttribute('data-quitar-llave');
    estado.llaves = estado.llaves.filter(function (k) { return k.id !== id; });
    guardar();
    pintarPlan();
    programarCalculo();
  });

  $('#btn-anadir-cilindro').addEventListener('click', function () {
    var c = { id: nuevoId('c'), nombre: '', medida: '', tipo: 'doble' };
    estado.cilindros.push(c);
    guardar();
    pintarPlan();
    enfocar('cn-' + c.id);
    programarCalculo();
  });

  $('#btn-anadir-llave').addEventListener('click', function () {
    var k = { id: nuevoId('k'), nombre: '', copias: '', abre: [], codigo: null, fijo: false };
    estado.llaves.push(k);
    guardar();
    pintarPlan();
    enfocar('kn-' + k.id);
  });

  $('#btn-ejemplo').addEventListener('click', function () {
    if (!window.confirm('Se sustituye el plan actual por el plan de ejemplo de la nave con 7 cilindros. ¿Seguimos?')) return;
    estado = planEjemplo();
    guardar();
    pintarTodo();
    calcular();
  });

  $('#btn-vaciar').addEventListener('click', function () {
    if (!window.confirm('Se borra la obra, la llave maestra, los cilindros, las llaves y los códigos. El cilindro y las pastillas se mantienen. ¿Seguimos?')) return;
    estado = planVacio(estado.sistema);
    guardar();
    pintarTodo();
    mensaje('Plan en blanco. Empieza por la obra y la llave maestra.', false);
    enfocar('plan-obra');
  });

  /* Datos de la obra */
  function pintarDatosPlan() {
    ['obra', 'referencia', 'notas'].forEach(function (k) {
      var el = document.querySelector('[data-plan="' + k + '"]');
      if (el && el.value !== estado[k]) el.value = estado[k] || '';
    });
  }
  document.querySelectorAll('[data-plan]').forEach(function (el) {
    el.addEventListener('input', function () {
      estado[el.getAttribute('data-plan')] = el.value;
      guardar();
    });
  });

  function pintarPlan() {
    conFoco(function () { pintarCilindros(); pintarAccesos(); });
    pintarResultado();
  }

  /* ---------- Resultado ---------- */

  function pintarResultado(sinCodigos) {
    var an = null;
    if (maestraCompleta() && estado.cilindros.length) an = Motor.analizar(datosMotor());
    conFoco(function () {
      pintarResumen(an);
      if (!sinCodigos) pintarCodigos(an);
      pintarMontaje(an);
      pintarComprobacion(an);
      pintarMaterial(an);
    });
  }

  function vacio(texto) { return '<div class="vacio">' + texto + '</div>'; }

  function pintarResumen(an) {
    var r = $('#resumen');
    if (!an || !hayCodigos()) { r.innerHTML = '<span class="pildora pildora-neutra">Sin calcular</span>'; return; }
    var lados = 0, total = 0;
    an.cilindros.forEach(function (c) { total += c.pastillas * c.lados; lados += c.lados; });
    var html = an.ok
      ? '<span class="pildora pildora-ok">Plan cumplido</span>'
      : '<span class="pildora pildora-error">' + plural(an.errores.length, 'error', 'errores') + '</span>';
    html += '<span class="pildora pildora-oro">' + plural(total, 'pastilla', 'pastillas') + ' en total</span>';
    html += '<span class="pildora pildora-neutra">Propuesta ' + (estado.semilla || 1) + '</span>';
    r.innerHTML = html;
  }

  function celdaAltura(v, maestra, H, editable, clave, etiqueta) {
    var ok = Number.isInteger(v) && v >= 1 && v <= H;
    var clases = 'celda-alt' + (ok && v !== maestra ? ' distinta' : '') + (!ok && editable ? ' invalida' : '');
    var estilo = 'style="--h:' + (ok ? v : 0) + ';--max:' + H + '"';
    if (!editable) return '<span class="' + clases + '" ' + estilo + '><b>' + (ok ? v : '') + '</b></span>';
    return '<span class="' + clases + '" ' + estilo + '><input inputmode="numeric" autocomplete="off" maxlength="' + String(H).length + '" ' +
      clave + ' value="' + (ok ? v : '') + '" aria-label="' + esc(etiqueta) + '"></span>';
  }

  function textoSilca(codigo) {
    var prof = estado.sistema.profundidades;
    if (!Array.isArray(codigo)) return '';
    return codigo.map(function (v) { return (v && prof[v - 1] != null && prof[v - 1] !== '') ? prof[v - 1] : '?'; }).join(' ');
  }

  function pintarCodigos(an) {
    var panel = $('#panel-codigos');
    var titulo = '<h3 class="titulo-impresion">Códigos de tallado</h3>';
    if (!maestraCompleta()) { panel.innerHTML = titulo + vacio('Completa la <strong>llave maestra</strong> para calcular los códigos.'); return; }
    if (!estado.llaves.length) { panel.innerHTML = titulo + vacio('Añade llaves al <strong>plan de cierre</strong> y marca los cilindros que abre cada una.'); return; }
    var s = estado.sistema, P = s.posiciones, H = s.alturas, M = estado.maestra;
    var nombresCil = {};
    estado.cilindros.forEach(function (c, i) { nombresCil[codigoCil(i)] = c.nombre; });

    var conProf = tieneProf();
    var cab = '<thead><tr><th scope="col">Llave</th>';
    for (var p = 0; p < P; p++) cab += '<th scope="col" class="col-pos">P' + (p + 1) + '</th>';
    cab += (conProf ? '<th scope="col">Profundidades</th>' : '') + '<th scope="col">Abre</th><th scope="col"><span class="oculto">Fijar</span></th></tr></thead>';

    var filas = '<tr class="fila-maestra-res"><th scope="row" class="nombre-llave">Maestra</th>';
    for (p = 0; p < P; p++) filas += '<td class="col-pos">' + celdaAltura(M[p], M[p], H, false) + '</td>';
    filas += (conProf ? '<td class="silca">' + textoSilca(M) + '</td>' : '') + '<td class="abre-lista">Todos</td><td></td></tr>';

    var mapa = {};
    estado.cilindros.forEach(function (c, i) { mapa[c.id] = codigoCil(i); });

    estado.llaves.forEach(function (k) {
      var nombre = k.nombre || 'Sin nombre';
      var cod = Array.isArray(k.codigo) ? k.codigo : [];
      filas += '<tr data-fila="' + k.id + '"><th scope="row" class="nombre-llave">' + esc(nombre) + '</th>';
      for (var q = 0; q < P; q++) {
        filas += '<td class="col-pos">' + celdaAltura(cod[q], M[q], H, true,
          'data-foco="kc-' + k.id + '-' + q + '" data-codigo="' + k.id + '" data-p="' + q + '"',
          nombre + ', posición ' + (q + 1)) + '</td>';
      }
      var abre = k.abre.map(function (id) { return mapa[id]; }).filter(Boolean);
      filas += (conProf ? '<td class="silca">' + textoSilca(cod.length ? cod : null) + '</td>' : '') +
        '<td class="abre-lista">' + (abre.length ? abre.join(', ') : 'Ninguno') + '</td>' +
        '<td><button type="button" class="boton-fijar no-imprimir" data-foco="kf-' + k.id + '" data-fijar="' + k.id + '" aria-pressed="' + (k.fijo ? 'true' : 'false') + '" ' +
        'title="' + (k.fijo ? 'Este código se mantiene al recalcular' : 'Fija este código para que no cambie al recalcular') + '">' +
        (k.fijo ? ICONO_CERRADO + 'Fijada' : ICONO_ABIERTO + 'Fijar') + '</button></td></tr>';
    });

    panel.innerHTML = titulo +
      '<div class="tabla-scroll"><table class="tabla tabla-codigos">' + cab + '<tbody>' + filas + '</tbody></table></div>' +
      '<p class="leyenda"><span class="muestra" aria-hidden="true"></span>Altura distinta de la maestra. Puedes corregir cualquier altura a mano: la llave queda fijada y la comprobación se rehace al momento.' +
        (conProf ? ' La columna Profundidades da el valor de la ficha para cada posición.' : '') + '</p>' +
      '<div class="acciones-res no-imprimir"><button type="button" class="boton-sec" id="btn-copiar">Copiar códigos</button>' +
      '<button type="button" class="boton-sec" id="btn-soltar">Soltar todas las llaves fijadas</button></div>';
  }

  $('#panel-codigos').addEventListener('input', function (e) {
    var el = e.target.closest('[data-codigo]');
    if (!el) return;
    var k = estado.llaves.find(function (x) { return x.id === el.getAttribute('data-codigo'); });
    if (!k) return;
    var p = Number(el.getAttribute('data-p'));
    var P = estado.sistema.posiciones, H = estado.sistema.alturas;
    if (!Array.isArray(k.codigo) || k.codigo.length !== P) {
      var viejo = Array.isArray(k.codigo) ? k.codigo : [];
      k.codigo = [];
      for (var i = 0; i < P; i++) k.codigo.push(viejo[i] || null);
    }
    var n = parseInt(el.value.replace(/\D/g, ''), 10);
    k.codigo[p] = (n >= 1 && n <= H) ? n : null;
    if (!k.codigo[p] && el.value !== '') el.value = '';
    k.fijo = true;
    guardar();
    actualizarFilaCodigo(k);
    pintarResultado(true);
    if (k.codigo[p] && p < P - 1) enfocar('kc-' + k.id + '-' + (p + 1));
  });

  /* Retoca la fila editada sin sustituir sus casillas. */
  function actualizarFilaCodigo(k) {
    var fila = document.querySelector('tr[data-fila="' + k.id + '"]');
    if (!fila) return;
    var H = estado.sistema.alturas, M = estado.maestra;
    fila.querySelectorAll('[data-codigo]').forEach(function (inp) {
      var q = Number(inp.getAttribute('data-p'));
      var v = k.codigo[q];
      var ok = Number.isInteger(v) && v >= 1 && v <= H;
      var celda = inp.parentNode;
      celda.classList.toggle('distinta', ok && v !== M[q]);
      celda.classList.toggle('invalida', !ok);
      celda.style.setProperty('--h', ok ? v : 0);
    });
    var prof = fila.querySelector('.silca');
    if (prof) prof.textContent = textoSilca(k.codigo);
    var b = fila.querySelector('[data-fijar]');
    if (b) {
      b.setAttribute('aria-pressed', k.fijo ? 'true' : 'false');
      b.innerHTML = k.fijo ? ICONO_CERRADO + 'Fijada' : ICONO_ABIERTO + 'Fijar';
    }
  }

  $('#panel-codigos').addEventListener('click', function (e) {
    var b = e.target.closest('[data-fijar]');
    if (b) {
      var k = estado.llaves.find(function (x) { return x.id === b.getAttribute('data-fijar'); });
      if (!k) return;
      k.fijo = !k.fijo;
      guardar();
      pintarResultado();
      return;
    }
    if (e.target.closest('#btn-soltar')) {
      estado.llaves.forEach(function (x) { x.fijo = false; });
      guardar();
      pintarResultado();
      mensaje('Ninguna llave queda fijada. Pulsa Calcular para rehacer todos los códigos.', false);
      return;
    }
    if (e.target.closest('#btn-copiar')) copiarCodigos();
  });

  function copiarCodigos() {
    var conProf = tieneProf();
    var lineas = ['Amaestramiento ' + estado.sistema.nombre];
    lineas.push('Maestra: ' + estado.maestra.join('-') + (conProf ? ' (prof. ' + textoSilca(estado.maestra) + ')' : ''));
    var mapa = {};
    estado.cilindros.forEach(function (c, i) { mapa[c.id] = codigoCil(i); });
    estado.llaves.forEach(function (k) {
      var cod = Array.isArray(k.codigo) ? k.codigo : [];
      lineas.push((k.nombre || 'Sin nombre') + ': ' + cod.map(function (v) { return v || '?'; }).join('-') +
        (conProf ? ' (prof. ' + textoSilca(cod) + ')' : '') +
        ' abre ' + k.abre.map(function (id) { return mapa[id]; }).filter(Boolean).join(', '));
    });
    var texto = lineas.join('\n');
    var hecho = function () { mensaje('Códigos copiados al portapapeles.', false); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(hecho, function () { copiarAlternativo(texto); hecho(); });
    } else { copiarAlternativo(texto); hecho(); }
  }
  function copiarAlternativo(texto) {
    var t = document.createElement('textarea');
    t.value = texto; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
    document.body.appendChild(t); t.select();
    try { document.execCommand('copy'); } catch (err) { /* sin portapapeles */ }
    document.body.removeChild(t);
  }

  function pintarMontaje(an) {
    var panel = $('#panel-montaje');
    var titulo = '<h3 class="titulo-impresion">Montaje de cilindros</h3>';
    if (!an || !hayCodigos()) { panel.innerHTML = titulo + vacio('Cuando calcules el amaestramiento verás aquí el pitón y las pastillas de cada cámara.'); return; }
    var P = estado.sistema.posiciones;
    var saltoMin = Math.min.apply(null, estado.sistema.pastillas.map(function (pa) { return pa.saltos; }));
    var nombres = {};
    an.llaves.forEach(function (l) { nombres[l.id] = l.nombre; });

    var cab = '<thead><tr><th scope="col">Cilindro</th>';
    for (var p = 0; p < P; p++) cab += '<th scope="col" class="col-pos">P' + (p + 1) + '</th>';
    cab += '<th scope="col">Pastillas</th><th scope="col">Lo abren</th></tr></thead>';

    var filas = an.cilindros.map(function (c) {
      var fila = '<tr><th scope="row" class="cil-celda"><b>' + esc(c.id) + '</b><span>' + esc(c.nombre) + '</span><small>' +
        esc(c.medida) + (c.medida ? ' · ' : '') + esc(String(c.tipo || '').toLowerCase()) + '</small></th>';
      for (var q = 0; q < P; q++) {
        var cam = c.camaras && c.camaras[q];
        if (!cam) { fila += '<td class="col-pos">·</td>'; continue; }
        var pila = '<span class="piton" title="Pitón de altura ' + cam.base + '">' + cam.base + '</span>' +
          cam.pila.map(function (pa) {
            return '<span class="pastilla' + (pa.saltos > saltoMin ? ' p-180' : '') + '" title="Pastilla ' + esc(nombrePastilla(pa)) + ' (sube ' + pa.saltos + ' alturas)">' +
              (tieneMm(pa) ? mm(pa.mm) : '+' + pa.saltos) + '</span>';
          }).join('');
        fila += '<td class="col-pos"><span class="pila" aria-label="Pitón ' + cam.base +
          (cam.pila.length ? ' más pastillas ' + cam.pila.map(nombrePastilla).join(' y ') : ' sin pastillas') + '">' + pila + '</span>' +
          '<span class="cortes">' + (cam.puntos.length > 1 ? 'corta en ' + cam.puntos.join(', ') : 'corta en ' + cam.base) + '</span></td>';
      }
      fila += '<td class="num">' + c.pastillas + (c.lados === 2 ? ' × 2' : '') + '</td>';
      fila += '<td class="abre-lista">' + c.autorizadas.map(function (id) { return esc(nombres[id]); }).join(', ') + '</td></tr>';
      return fila;
    }).join('');

    panel.innerHTML = titulo +
      '<div class="tabla-scroll"><table class="tabla tabla-montaje">' + cab + '<tbody>' + filas + '</tbody></table></div>' +
      '<p class="leyenda">Cada cámara se lee de abajo arriba: el pitón (negro) apoya en la llave y encima van las pastillas (oro). En los cilindros dobles las dos mitades se montan igual.</p>';
  }

  function pintarComprobacion(an) {
    var panel = $('#panel-comprobacion');
    var titulo = '<h3 class="titulo-impresion">Comprobación del plan</h3>';
    if (!an || !hayCodigos()) { panel.innerHTML = titulo + vacio('La comprobación aparece cuando hay códigos calculados.'); return; }

    var cab = '<thead><tr><th scope="col">Llave</th>' + an.cilindros.map(function (c) {
      return '<th scope="col" class="cil" title="' + esc(c.nombre) + '">' + esc(c.id) + '</th>';
    }).join('') + '</tr></thead>';

    var filas = an.llaves.map(function (l, i) {
      return '<tr><th scope="row" class="nombre-llave">' + esc(l.nombre) + '</th>' + an.matriz[i].map(function (m, j) {
        var c = an.cilindros[j];
        if (m.autorizada && m.abre) return '<td class="estado estado-ok" title="Abre ' + esc(c.id) + '">✓<span class="oculto"> abre</span></td>';
        if (!m.autorizada && !m.abre) return '<td class="estado estado-no" title="No abre ' + esc(c.id) + '">·<span class="oculto"> no abre</span></td>';
        if (!m.autorizada && m.abre) return '<td class="estado estado-mal">Abre de más</td>';
        return '<td class="estado estado-mal">No abre</td>';
      }).join('') + '</tr>';
    }).join('');

    filas += '<tr><th scope="row">Llaves posibles</th>' + an.cilindros.map(function (c) {
      return '<td class="estado num" title="Combinaciones de corte que abren ' + esc(c.id) + '">' + c.teoricas + '</td>';
    }).join('') + '</tr>';

    var mensajes = '';
    if (an.ok) mensajes += '<li class="m-ok">Todas las llaves abren lo que marca el plan y ninguna abre un cilindro de más.</li>';
    an.errores.forEach(function (e) { mensajes += '<li class="m-error">' + esc(e.texto) + '</li>'; });
    an.avisos.forEach(function (a) { mensajes += '<li class="m-aviso">' + esc(a.texto) + '</li>'; });

    panel.innerHTML = titulo +
      '<div class="tabla-scroll"><table class="tabla tabla-matriz">' + cab + '<tbody>' + filas + '</tbody></table></div>' +
      '<p class="leyenda">Cada llave se prueba contra cada cilindro con las pilas calculadas. Llaves posibles es el número de combinaciones de corte que abrirían ese cilindro: cuanto más bajo, más seguro.</p>' +
      '<ul class="lista-mensajes">' + mensajes + '</ul>';
  }

  function pintarMaterial(an) {
    var panel = $('#panel-material');
    var titulo = '<h3 class="titulo-impresion">Material</h3>';
    if (!an || !hayCodigos()) { panel.innerHTML = titulo + vacio('El material necesario aparece cuando hay códigos calculados.'); return; }
    var H = estado.sistema.alturas;
    var pitones = '';
    for (var h = 1; h <= H; h++) {
      pitones += '<tr><th scope="row">Altura ' + h + '</th><td class="num">' + (an.material.pitones[h - 1] || 0) + '</td></tr>';
    }
    var pastillas = estado.sistema.pastillas.map(function (p) {
      return '<tr><th scope="row">' + esc(tieneMm(p) ? mm(p.mm) + ' mm (' + p.saltos + ' alturas)' : 'Sube ' + p.saltos + ' alturas') + '</th><td class="num">' + (an.material.pastillas[p.saltos] || 0) + '</td></tr>';
    }).join('');
    var porCil = an.cilindros.map(function (c) {
      return '<tr><th scope="row">' + esc(c.id) + ' ' + esc(c.nombre) + '</th><td>' + esc(c.medida) + '</td><td class="num">' + (c.pastillas * c.lados) + '</td></tr>';
    }).join('');
    panel.innerHTML = titulo +
      '<div class="rejilla-material">' +
        '<div><h3>Pitones</h3><div class="tabla-scroll"><table class="tabla"><thead><tr><th scope="col">Pitón</th><th scope="col">Unidades</th></tr></thead><tbody>' + pitones + '</tbody></table></div></div>' +
        '<div><h3>Pastillas</h3><div class="tabla-scroll"><table class="tabla"><thead><tr><th scope="col">Pastilla</th><th scope="col">Unidades</th></tr></thead><tbody>' + pastillas + '</tbody></table></div>' +
        '<h3 style="margin-top:16px">Pastillas por cilindro</h3><div class="tabla-scroll"><table class="tabla"><thead><tr><th scope="col">Cilindro</th><th scope="col">Medida</th><th scope="col">Pastillas</th></tr></thead><tbody>' + porCil + '</tbody></table></div></div>' +
      '</div>' +
      '<p class="leyenda">Las cantidades cuentan las dos mitades de los cilindros dobles. Solo incluyen los pitones inferiores y las pastillas; los contrapitones y muelles van como en un cilindro sin amaestrar.</p>';
  }

  /* ---------- Pestañas ---------- */

  var pestanas = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
  function activar(tab, enfocarla) {
    pestanas.forEach(function (t) {
      var activa = t === tab;
      t.setAttribute('aria-selected', activa ? 'true' : 'false');
      t.tabIndex = activa ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !activa;
    });
    if (enfocarla) tab.focus();
  }
  pestanas.forEach(function (t, i) {
    t.addEventListener('click', function () { activar(t); });
    t.addEventListener('keydown', function (e) {
      var j = null;
      if (e.key === 'ArrowRight') j = (i + 1) % pestanas.length;
      if (e.key === 'ArrowLeft') j = (i - 1 + pestanas.length) % pestanas.length;
      if (e.key === 'Home') j = 0;
      if (e.key === 'End') j = pestanas.length - 1;
      if (j != null) { e.preventDefault(); activar(pestanas[j], true); }
    });
  });

  /* ---------- Cilindro y pastillas ---------- */

  function pintarSistema() {
    var s = estado.sistema;
    $('#sistema-resumen').textContent = resumenSistema();

    var opciones = Object.keys(PLANTILLAS).map(function (id) {
      return '<option value="' + id + '"' + (s.plantilla === id ? ' selected' : '') + '>' + esc(PLANTILLAS[id].etiqueta) + '</option>';
    }).join('') + '<option value="personalizado"' + (PLANTILLAS[s.plantilla] ? '' : ' selected') + '>Personalizado</option>';

    var prof = '';
    for (var h = 1; h <= s.alturas; h++) {
      prof += '<tr><th scope="row">Altura ' + h + '</th><td><input type="text" inputmode="decimal" data-foco="sp-' + h + '" data-prof="' + h + '" value="' +
        esc(s.profundidades[h - 1] != null ? s.profundidades[h - 1] : '') + '" placeholder="opcional" aria-label="Profundidad de la altura ' + h + '"></td></tr>';
    }
    var past = s.pastillas.map(function (p, i) {
      return '<tr><td><input type="text" inputmode="numeric" data-foco="ps-' + i + '" data-past="' + i + '" data-campo="saltos" value="' + p.saltos + '" aria-label="Alturas que sube la pastilla ' + (i + 1) + '"></td>' +
        '<td><input type="text" inputmode="decimal" data-foco="pm-' + i + '" data-past="' + i + '" data-campo="mm" value="' + (tieneMm(p) ? mm(p.mm) : '') + '" placeholder="opcional" aria-label="Grosor en mm de la pastilla ' + (i + 1) + '"></td>' +
        '<td><button type="button" class="boton-icono" data-quitar-past="' + i + '" aria-label="Quitar la pastilla ' + esc(nombrePastilla(p)) + '">' + ICONO_BORRAR + '</button></td></tr>';
    }).join('');

    $('#sistema-cuerpo').innerHTML =
      '<div>' +
        '<div class="campos">' +
          '<div class="campo"><label for="s-plantilla">Partir de</label><select id="s-plantilla" data-foco="s-plantilla">' + opciones + '</select></div>' +
          campo('Marca y modelo', 'nombre', s.nombre, 'text') +
          campo('Posiciones (pitones)', 'posiciones', s.posiciones, 'numeric') +
          campo('Alturas por posición', 'alturas', s.alturas, 'numeric') +
          campo('Posiciones distintas con la maestra', 'minDifMaestra', s.minDifMaestra, 'numeric') +
          campo('Posiciones distintas entre llaves', 'minDifLlaves', s.minDifLlaves, 'numeric') +
        '</div>' +
        '<h3 class="sub">Pastillas de amaestramiento</h3>' +
        '<p class="leyenda arriba">Indica cuántas alturas sube cada pastilla que tengas. El grosor en mm es opcional y sale en la hoja y en el documento.</p>' +
        '<div class="tabla-scroll"><table class="tabla tabla-pastillas"><thead><tr><th scope="col">Alturas que sube</th><th scope="col">Grosor (mm)</th><th scope="col"><span class="oculto">Quitar</span></th></tr></thead><tbody>' + past + '</tbody></table></div>' +
        '<button type="button" class="boton-anadir" id="btn-anadir-pastilla">Añadir pastilla</button>' +
      '</div>' +
      '<div>' +
        '<h3 class="sub sin-margen">Profundidades de corte (opcional)</h3>' +
        '<p class="leyenda arriba">Si tienes la ficha del fabricante o de Silca, escribe la profundidad de cada altura y saldrá junto a cada código.</p>' +
        '<div class="tabla-scroll"><table class="tabla tabla-prof"><thead><tr><th scope="col">Altura</th><th scope="col">Profundidad</th></tr></thead><tbody>' + prof + '</tbody></table></div>' +
        '<div class="campos" style="margin-top:12px">' +
          campo('Separación entre posiciones', 'espaciado', s.espaciado, 'decimal') +
          campo('STOP', 'stop', s.stop, 'decimal') +
        '</div>' +
      '</div>';
  }

  function campo(etiqueta, clave, valor, tipo) {
    return '<div class="campo"><label for="s-' + clave + '">' + etiqueta + '</label>' +
      '<input id="s-' + clave + '" data-foco="s-' + clave + '" data-sis="' + clave + '" type="text" inputmode="' + (tipo === 'text' ? 'text' : tipo) + '" value="' + esc(valor == null ? '' : valor) + '"></div>';
  }

  function ajustarTamanos(P, H) {
    var s = estado.sistema;
    var cambia = P !== s.posiciones || H !== s.alturas;
    s.posiciones = P; s.alturas = H;
    if (!cambia) return;
    var m = [];
    for (var i = 0; i < P; i++) {
      var v = estado.maestra[i];
      m.push(Number.isInteger(v) && v >= 1 && v <= H ? v : null);
    }
    estado.maestra = m;
    var prof = s.profundidades.slice(0, H);
    while (prof.length < H) prof.push('');
    s.profundidades = prof;
    estado.llaves.forEach(function (k) { k.codigo = null; k.fijo = false; });
  }

  $('#sistema-cuerpo').addEventListener('change', function (e) {
    var el = e.target;
    var s = estado.sistema;
    if (el.id === 's-plantilla') {
      if (el.value === 'personalizado') { s.plantilla = 'personalizado'; guardar(); return; }
      var nuevo = plantilla(el.value);
      ajustarTamanos(nuevo.posiciones, nuevo.alturas);
      estado.sistema = nuevo;
    } else if (el.hasAttribute('data-sis')) {
      var clave = el.getAttribute('data-sis');
      var n = parseInt(el.value, 10);
      if (clave === 'nombre') s.nombre = el.value.trim();
      else if (clave === 'posiciones') ajustarTamanos(Math.min(10, Math.max(2, n || s.posiciones)), s.alturas);
      else if (clave === 'alturas') ajustarTamanos(s.posiciones, Math.min(12, Math.max(2, n || s.alturas)));
      else if (clave === 'minDifMaestra' || clave === 'minDifLlaves') s[clave] = Math.min(s.posiciones, Math.max(1, n || 1));
      else s[clave] = el.value.trim();
      s.plantilla = 'personalizado';
    } else if (el.hasAttribute('data-prof')) {
      var h = Number(el.getAttribute('data-prof'));
      var valor = el.value.trim();
      var num = Number(valor.replace(',', '.'));
      s.profundidades[h - 1] = valor === '' ? '' : (isNaN(num) ? valor : num);
      s.plantilla = 'personalizado';
    } else if (el.hasAttribute('data-past')) {
      var p = s.pastillas[Number(el.getAttribute('data-past'))];
      if (!p) return;
      if (el.getAttribute('data-campo') === 'mm') {
        var g = parseFloat(el.value.replace(',', '.'));
        p.mm = g > 0 ? Math.round(g * 100) / 100 : null;
      } else {
        var sa = parseInt(el.value, 10);
        if (sa > 0 && sa < s.alturas) p.saltos = sa;
      }
      s.plantilla = 'personalizado';
    } else return;
    guardar();
    conFoco(pintarTodo);
    programarCalculo();
  });

  $('#sistema-cuerpo').addEventListener('click', function (e) {
    var s = estado.sistema;
    var q = e.target.closest('[data-quitar-past]');
    if (q) {
      if (s.pastillas.length <= 1) { mensaje('Hace falta al menos una pastilla para poder amaestrar.', true); return; }
      s.pastillas.splice(Number(q.getAttribute('data-quitar-past')), 1);
    } else if (e.target.closest('#btn-anadir-pastilla')) {
      var usadas = s.pastillas.map(function (p) { return p.saltos; });
      var sig = 1;
      while (usadas.indexOf(sig) !== -1 && sig < s.alturas - 1) sig++;
      s.pastillas.push({ mm: null, saltos: sig });
    } else return;
    s.plantilla = 'personalizado';
    guardar();
    pintarTodo();
    programarCalculo();
  });

  /* ---------- Guardar el plan como documento ---------- */

  function leerLogo() {
    return fetch('img/logo-sbc.png').then(function (r) {
      if (!r.ok) throw new Error('sin logo');
      return r.blob();
    }).then(function (b) {
      return new Promise(function (ok, mal) {
        var fr = new FileReader();
        fr.onload = function () { ok(fr.result); };
        fr.onerror = mal;
        fr.readAsDataURL(b);
      });
    }).catch(function () { return null; });
  }

  function limpiarNombre(t) {
    return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  }

  var CSS_DOC = [
    '*{box-sizing:border-box}',
    'body{margin:0;background:#efebe2;color:#1b1a17;font:14px/1.5 Inter,"Segoe UI",Helvetica,Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}',
    '.hoja{max-width:900px;margin:24px auto;background:#fff;box-shadow:0 2px 18px rgba(0,0,0,.08)}',
    '.cab{background:#0c0c0c;color:#f3efe6;padding:22px 32px;display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:3px solid #b89855}',
    '.cab img{width:110px;height:auto;display:block}',
    '.cab .tipo{text-align:right;font-size:13px;color:#c9c2b2}',
    '.cab .tipo b{display:block;font-size:17px;color:#d7c278}',
    '.cuerpo{padding:28px 32px 32px}',
    'h1{font-size:26px;line-height:1.2;margin:0 0 4px;letter-spacing:-.01em}',
    '.meta{color:#5f5a4f;margin:0}',
    '.meta span+span:before{content:" · "}',
    '.notas{margin:14px 0 0;padding:10px 14px;background:#faf8f3;border-left:3px solid #b89855;color:#3a372f;white-space:pre-wrap}',
    'h2{font-size:15px;margin:28px 0 10px;padding-bottom:6px;border-bottom:1px solid #e4ddcd;display:flex;align-items:center;gap:8px}',
    'h2:before{content:"";width:4px;height:16px;background:#b89855;border-radius:2px}',
    '.maestra{display:flex;flex-wrap:wrap;align-items:flex-end;gap:18px}',
    '.digitos{display:flex;gap:8px}',
    '.digito{text-align:center}',
    '.digito small{display:block;font-size:10px;color:#7a7465;font-weight:600}',
    '.digito b{display:grid;place-items:center;width:44px;height:52px;border:2px solid #b89855;border-radius:8px;font:700 24px/1 "JetBrains Mono",Menlo,Consolas,monospace;color:#0c0c0c;background:#fbf7ec}',
    '.digito i{display:block;font-style:normal;font-size:11px;color:#5f5a4f;font-family:Menlo,Consolas,monospace;margin-top:3px}',
    '.codigo-maestra{font:700 18px Menlo,Consolas,monospace;letter-spacing:.08em}',
    'table{width:100%;border-collapse:collapse;font-size:12.5px}',
    'th,td{border-bottom:1px solid #e9e3d6;padding:6px 8px;text-align:left;vertical-align:middle}',
    'thead th{background:#f4f1ea;font-size:11.5px;color:#5f5a4f}',
    '.c{text-align:center}',
    '.mono{font-family:Menlo,Consolas,monospace}',
    '.dif{background:#f1e5c4;font-weight:700;border-radius:4px}',
    '.alt{display:inline-block;min-width:22px;padding:2px 4px;text-align:center;font:700 13px Menlo,Consolas,monospace}',
    '.si{color:#2e7a4b;font-weight:700}',
    '.no{color:#b9b3a5}',
    '.mal{color:#b42318;font-weight:700;background:#fdecea}',
    '.pila{display:inline-flex;flex-direction:column-reverse;align-items:center;gap:2px}',
    '.pit{display:inline-block;min-width:24px;padding:1px 5px;border-radius:4px;background:#0c0c0c;color:#d7c278;font:700 12px Menlo,Consolas,monospace;text-align:center}',
    '.pas{display:inline-block;min-width:34px;padding:0 4px;border-radius:3px;background:#b89855;color:#0c0c0c;font:700 10px Menlo,Consolas,monospace;text-align:center}',
    '.estado{display:inline-block;margin-top:12px;padding:6px 12px;border-radius:999px;font-weight:600;font-size:13px}',
    '.estado.ok{background:#e5f3e9;color:#2e7a4b}',
    '.estado.err{background:#fdecea;color:#b42318}',
    'ul.msg{margin:10px 0 0;padding-left:18px;color:#5f5a4f;font-size:12.5px}',
    '.dos{display:grid;grid-template-columns:1fr 1fr;gap:24px}',
    '.pie{margin-top:28px;padding-top:12px;border-top:1px solid #e4ddcd;color:#7a7465;font-size:11.5px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}',
    '.acciones{max-width:900px;margin:16px auto 0;display:flex;justify-content:flex-end;gap:8px;padding:0 4px}',
    '.acciones button{font:600 14px Inter,Helvetica,Arial,sans-serif;padding:10px 18px;border-radius:9px;border:0;background:#b89855;color:#0c0c0c;cursor:pointer}',
    '.bloque{break-inside:avoid}',
    '@media (max-width:640px){.cab,.cuerpo{padding-left:16px;padding-right:16px}.dos{grid-template-columns:1fr}.tabla-scroll{overflow-x:auto}.hoja{margin:0}}',
    '@media print{body{background:#fff}.hoja{margin:0;max-width:none;box-shadow:none}.acciones{display:none}@page{size:A4;margin:10mm}}'
  ].join('');

  function documentoPlan(logo) {
    var s = estado.sistema, P = s.posiciones, M = estado.maestra;
    var conProf = tieneProf();
    var an = (maestraCompleta() && estado.cilindros.length) ? Motor.analizar(datosMotor()) : null;
    var conCodigos = an && hayCodigos();
    var fecha = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    var obra = estado.obra || 'Plan sin nombre';
    var mapa = {};
    estado.cilindros.forEach(function (c, i) { mapa[c.id] = codigoCil(i); });
    var saltoMin = Math.min.apply(null, s.pastillas.map(function (p) { return p.saltos; }));
    var cabPos = '';
    for (var p = 0; p < P; p++) cabPos += '<th class="c">P' + (p + 1) + '</th>';

    // Llave maestra
    var digitos = '';
    for (p = 0; p < P; p++) {
      var v = M[p];
      digitos += '<div class="digito"><small>P' + (p + 1) + '</small><b>' + (v || '') + '</b>' +
        (conProf && v ? '<i>' + esc(s.profundidades[v - 1]) + '</i>' : '') + '</div>';
    }

    // Cilindros
    var filasCil = estado.cilindros.map(function (c, i) {
      return '<tr><td class="mono"><b>' + codigoCil(i) + '</b></td><td>' + esc(c.nombre || 'Sin nombre') + '</td><td>' + esc(c.medida || '') + '</td><td>' + esc(TIPOS[c.tipo] ? TIPOS[c.tipo].etiqueta : 'Doble') + '</td></tr>';
    }).join('');

    // Plan de cierre
    var cabCil = estado.cilindros.map(function (c, i) { return '<th class="c">' + codigoCil(i) + '</th>'; }).join('');
    var filasPlan = '<tr><td><b>Maestra</b></td><td class="c">' + (estado.copiasMaestra || '') + '</td>' + estado.cilindros.map(function () { return '<td class="c si">✓</td>'; }).join('') + '</tr>' +
      estado.llaves.map(function (k) {
        return '<tr><td><b>' + esc(k.nombre || 'Sin nombre') + '</b></td><td class="c">' + (k.copias || '') + '</td>' + estado.cilindros.map(function (c) {
          return k.abre.indexOf(c.id) !== -1 ? '<td class="c si">✓</td>' : '<td class="c no">·</td>';
        }).join('') + '</tr>';
      }).join('');

    // Códigos
    function filaCodigo(nombre, cod, abre, esM) {
      var celdas = '';
      for (var q = 0; q < P; q++) {
        var x = cod && cod[q];
        celdas += '<td class="c"><span class="alt' + (!esM && x && x !== M[q] ? ' dif' : '') + '">' + (x || '?') + '</span></td>';
      }
      return '<tr><td><b>' + esc(nombre) + '</b></td>' + celdas +
        (conProf ? '<td class="mono">' + (cod ? textoSilca(cod) : '') + '</td>' : '') +
        '<td>' + abre + '</td></tr>';
    }
    var filasCod = filaCodigo('Maestra', M, 'Todos', true) + estado.llaves.map(function (k) {
      return filaCodigo(k.nombre || 'Sin nombre', Array.isArray(k.codigo) ? k.codigo : null,
        k.abre.map(function (id) { return mapa[id]; }).filter(Boolean).join(', ') || 'Ninguno', false);
    }).join('');

    // Montaje
    var filasMont = '', material = '';
    if (conCodigos) {
      filasMont = an.cilindros.map(function (c) {
        var celdas = '';
        for (var q = 0; q < P; q++) {
          var cam = c.camaras && c.camaras[q];
          if (!cam) { celdas += '<td class="c">·</td>'; continue; }
          celdas += '<td class="c"><span class="pila"><span class="pit">' + cam.base + '</span>' + cam.pila.map(function (pa) {
            return '<span class="pas"' + (pa.saltos > saltoMin ? ' style="background:#d7c278;padding-top:3px;padding-bottom:3px"' : '') + '>' + (tieneMm(pa) ? mm(pa.mm) : '+' + pa.saltos) + '</span>';
          }).join('') + '</span></td>';
        }
        return '<tr><td><b class="mono">' + esc(c.id) + '</b> ' + esc(c.nombre) + '</td>' + celdas + '<td class="c">' + (c.pastillas * c.lados) + '</td></tr>';
      }).join('');

      var pit = '';
      for (var h = 1; h <= s.alturas; h++) if (an.material.pitones[h - 1]) pit += '<tr><td>Pitón de altura ' + h + '</td><td class="c">' + an.material.pitones[h - 1] + '</td></tr>';
      var pas = s.pastillas.map(function (pa) {
        return '<tr><td>Pastilla ' + esc(nombrePastilla(pa)) + (tieneMm(pa) ? ' (' + pa.saltos + ' alturas)' : '') + '</td><td class="c">' + (an.material.pastillas[pa.saltos] || 0) + '</td></tr>';
      }).join('');
      var totalCopias = (Number(estado.copiasMaestra) || 0) + estado.llaves.reduce(function (t, k) { return t + (Number(k.copias) || 0); }, 0);
      var llavesTallar = totalCopias ? '<tr><td>Llaves a tallar (copias)</td><td class="c">' + totalCopias + '</td></tr>' : '';
      material = '<div class="dos bloque"><div><table><thead><tr><th>Pitones inferiores</th><th class="c">Unidades</th></tr></thead><tbody>' + pit + '</tbody></table></div>' +
        '<div><table><thead><tr><th>Pastillas y llaves</th><th class="c">Unidades</th></tr></thead><tbody>' + pas + llavesTallar + '</tbody></table></div></div>';
    }

    var estadoHtml = '';
    if (conCodigos) {
      estadoHtml = an.ok
        ? '<span class="estado ok">Comprobado: cada llave abre solo los cilindros previstos</span>'
        : '<span class="estado err">' + plural(an.errores.length, 'error', 'errores') + ' en la comprobación</span>';
      var lista = an.errores.map(function (x) { return '<li>' + esc(x.texto) + '</li>'; }).join('') +
        an.avisos.map(function (x) { return '<li>' + esc(x.texto) + '</li>'; }).join('');
      if (lista) estadoHtml += '<ul class="msg">' + lista + '</ul>';
    }

    var meta = '<p class="meta">' + (estado.referencia ? '<span>Ref. ' + esc(estado.referencia) + '</span>' : '') +
      '<span>' + esc(resumenSistema()) + '</span></p>';

    var datos = JSON.stringify(estado).replace(/</g, '\\u003c');

    return '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<title>Plan de amaestramiento · ' + esc(obra) + '</title><style>' + CSS_DOC + '</style></head><body>' +
      '<div class="acciones"><button type="button" onclick="window.print()">Imprimir o guardar en PDF</button></div>' +
      '<div class="hoja"><div class="cab">' + (logo ? '<img src="' + logo + '" alt="SBC Grupo Sebalcab">' : '<b>SBC Grupo Sebalcab</b>') +
      '<div class="tipo">Plan de amaestramiento<b>' + esc(fecha) + '</b></div></div><div class="cuerpo">' +
      '<h1>' + esc(obra) + '</h1>' + meta +
      (estado.notas ? '<p class="notas">' + esc(estado.notas) + '</p>' : '') +
      '<div class="bloque"><h2>Llave maestra</h2><div class="maestra"><div class="digitos">' + digitos + '</div>' +
        '<div><span class="codigo-maestra">' + (maestraCompleta() ? M.join('-') : 'Sin completar') + '</span></div></div></div>' +
      '<div class="bloque"><h2>Cilindros</h2><div class="tabla-scroll"><table><thead><tr><th>Código</th><th>Puerta</th><th>Medida</th><th>Tipo</th></tr></thead><tbody>' + filasCil + '</tbody></table></div></div>' +
      '<div class="bloque"><h2>Plan de cierre</h2><div class="tabla-scroll"><table><thead><tr><th>Llave</th><th class="c">Copias</th>' + cabCil + '</tr></thead><tbody>' + filasPlan + '</tbody></table></div></div>' +
      '<div class="bloque"><h2>Códigos de tallado</h2><div class="tabla-scroll"><table><thead><tr><th>Llave</th>' + cabPos + (conProf ? '<th>Profundidades</th>' : '') + '<th>Abre</th></tr></thead><tbody>' + filasCod + '</tbody></table></div>' +
        '<p class="meta" style="margin-top:6px;font-size:11.5px"><span class="alt dif">3</span> altura distinta de la maestra</p></div>' +
      (conCodigos ? '<div class="bloque"><h2>Montaje de cilindros</h2><div class="tabla-scroll"><table><thead><tr><th>Cilindro</th>' + cabPos + '<th class="c">Pastillas</th></tr></thead><tbody>' + filasMont + '</tbody></table></div>' +
        '<p class="meta" style="margin-top:6px;font-size:11.5px">Cada cámara se lee de abajo arriba: pitón (negro) contra la llave y pastillas (oro) encima. En los cilindros dobles las dos mitades se montan igual.</p></div>' +
        '<div class="bloque"><h2>Material</h2>' + material + '</div>' +
        '<div class="bloque"><h2>Comprobación</h2>' + estadoHtml + '</div>' : '') +
      '<div class="pie"><span>SBC Grupo Sebalcab · sebalcab.es</span><span>Cálculo teórico. Prueba cada cilindro con todas sus llaves antes de entregarlo.</span></div>' +
      '</div></div>' +
      '<script type="application/json" id="plan-amaestramiento">' + datos + '<\/script>' +
      '</body></html>';
  }

  $('#btn-guardar').addEventListener('click', function () {
    leerLogo().then(function (logo) {
      var html = documentoPlan(logo);
      var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      var fecha = new Date().toISOString().slice(0, 10);
      var nombre = limpiarNombre(estado.obra);
      a.href = url;
      a.download = 'Plan-amaestramiento' + (nombre ? '-' + nombre : '') + '-' + fecha + '.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      mensaje('Plan guardado como documento (' + a.download + '). Ábrelo para verlo o imprimirlo en PDF; con Abrir plan vuelve a la calculadora.', false);
    });
  });

  function extraerPlan(texto) {
    var t = String(texto).trim();
    if (t.charAt(0) === '{') return JSON.parse(t);
    var doc = new DOMParser().parseFromString(t, 'text/html');
    var nodo = doc.getElementById('plan-amaestramiento');
    if (!nodo) throw new Error('sin datos');
    return JSON.parse(nodo.textContent);
  }

  $('#archivo-plan').addEventListener('change', function (e) {
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    var lector = new FileReader();
    lector.onload = function () {
      try {
        var nuevo = extraerPlan(lector.result);
        if (!estadoValido(nuevo)) throw new Error('formato');
        estado = completarEstado(nuevo);
        guardar();
        pintarTodo();
        mensaje('Plan abierto desde ' + f.name + '.', false);
      } catch (err) {
        mensaje('El archivo ' + f.name + ' no es un plan guardado con esta calculadora.', true);
      }
      e.target.value = '';
    };
    lector.readAsText(f);
  });


  $('#btn-abrir').addEventListener('click', function () { $('#archivo-plan').click(); });
  $('#btn-imprimir').addEventListener('click', function () { window.print(); });

  // Al entrar en una casilla de altura se selecciona su valor para sobrescribirlo
  document.addEventListener('focusin', function (e) {
    var t = e.target;
    if (t.matches && t.matches('[data-m], [data-codigo]') && t.select) t.select();
  });

  $('#btn-calcular').addEventListener('click', calcular);
  $('#btn-otra').addEventListener('click', function () {
    estado.semilla = (estado.semilla || 1) + 1;
    calcular();
  });

  /* ---------- Arranque ---------- */

  function pintarTodo() {
    pintarDatosPlan();
    pintarMaestra();
    pintarCilindros();
    pintarAccesos();
    pintarSistema();
    pintarResultado();
  }

  pintarTodo();
  if (!hayCodigos() && maestraCompleta()) calcular();
})();
