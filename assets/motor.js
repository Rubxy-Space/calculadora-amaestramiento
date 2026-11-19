/*
 * Motor de cálculo de amaestramiento con pastillas (master wafers).
 *
 * Modelo:
 *  - Cada llave tiene un código de P posiciones con alturas 1..H.
 *  - En cada cámara del cilindro la pila es: pitón de la altura más baja
 *    de las llaves que lo abren y, encima, pastillas que suben la pila
 *    tantas alturas como "saltos" tenga cada pastilla (0,90 mm = 2, 1,80 mm = 4).
 *  - Una cámara corta en cada altura acumulada de la pila. Una llave abre
 *    el cilindro si en todas las posiciones su altura coincide con un corte.
 *
 * Funciona en el navegador (window.Motor) y en Node (require).
 */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.Motor = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- utilidades ---------- */

  function crearAzar(semilla) {
    var a = (semilla >>> 0) || 1;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hamming(a, b) {
    var d = 0;
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
    return d;
  }

  function codigoValido(codigo, P, H) {
    if (!Array.isArray(codigo) || codigo.length !== P) return false;
    for (var i = 0; i < P; i++) {
      var v = codigo[i];
      if (!Number.isInteger(v) || v < 1 || v > H) return false;
    }
    return true;
  }

  /* Descomposición de un salto en el menor número de pastillas. */
  function tablaDescomposicion(H, pastillas) {
    var validas = pastillas.filter(function (p) { return Number.isInteger(p.saltos) && p.saltos > 0; })
      .sort(function (a, b) { return b.saltos - a.saltos; });
    var mejor = new Array(H).fill(null);
    mejor[0] = [];
    for (var s = 1; s < H; s++) {
      for (var i = 0; i < validas.length; i++) {
        var p = validas[i];
        if (p.saltos <= s && mejor[s - p.saltos]) {
          var c = [p].concat(mejor[s - p.saltos]);
          if (!mejor[s] || c.length < mejor[s].length) mejor[s] = c;
        }
      }
    }
    return mejor;
  }

  function contexto(sistema) {
    var P = sistema.posiciones, H = sistema.alturas;
    return {
      P: P,
      H: H,
      decomp: tablaDescomposicion(H, sistema.pastillas),
      minDifMaestra: sistema.minDifMaestra || 1,
      minDifLlaves: sistema.minDifLlaves || 1
    };
  }

  /* Monta una cámara a partir de las alturas de las llaves que deben abrirla. */
  function montarCamara(ctx, valores) {
    var v = Array.from(new Set(valores)).sort(function (a, b) { return a - b; });
    var pila = [], puntos = [v[0]], error = null;
    for (var i = 1; i < v.length; i++) {
      var salto = v[i] - v[i - 1];
      var d = ctx.decomp[salto];
      if (!d) {
        error = { de: v[i - 1], a: v[i], salto: salto };
        puntos.push(v[i]);
        continue;
      }
      var actual = v[i - 1];
      for (var j = 0; j < d.length; j++) {
        actual += d[j].saltos;
        pila.push(d[j]);
        puntos.push(actual);
      }
    }
    return {
      base: v[0],
      cortes: v,
      pila: pila,
      puntos: puntos,
      fantasmas: puntos.filter(function (x) { return v.indexOf(x) === -1; }),
      error: error
    };
  }

  /* Normaliza los datos: la maestra pasa a ser la primera llave y abre todo. */
  function normalizar(datos) {
    var ids = datos.cilindros.map(function (c) { return c.id; });
    var maestra = {
      id: '__maestra',
      nombre: 'Maestra',
      abre: ids.slice(),
      codigo: datos.maestra.slice(),
      fijo: true,
      esMaestra: true
    };
    var llaves = [maestra].concat(datos.llaves.map(function (l) {
      return {
        id: l.id,
        nombre: l.nombre,
        abre: l.abre.filter(function (id) { return ids.indexOf(id) !== -1; }),
        codigo: l.codigo ? l.codigo.slice() : null,
        fijo: !!l.fijo,
        esMaestra: false
      };
    }));
    return { cilindros: datos.cilindros, llaves: llaves };
  }

  /* ---------- análisis completo de un sistema ya codificado ---------- */

  function analizar(datos) {
    var sis = datos.sistema;
    var ctx = contexto(sis);
    var n = normalizar(datos);
    var errores = [], avisos = [];

    n.llaves.forEach(function (l) {
      l.valida = codigoValido(l.codigo, ctx.P, ctx.H);
      if (!l.valida) {
        errores.push({
          tipo: l.esMaestra ? 'maestra-incompleta' : 'codigo-incompleto',
          llave: l.id,
          texto: (l.esMaestra ? 'La llave maestra' : 'La llave ' + l.nombre) +
            ' no tiene un código completo de ' + ctx.P + ' alturas entre 1 y ' + ctx.H + '.'
        });
      }
    });

    var porId = {};
    n.llaves.forEach(function (l) { porId[l.id] = l; });

    var cilindros = n.cilindros.map(function (c) {
      var autorizadas = n.llaves.filter(function (l) { return l.abre.indexOf(c.id) !== -1; });
      var conCodigo = autorizadas.filter(function (l) { return l.valida; });
      var camaras = null, pastillas = 0, teoricas = 0;
      if (conCodigo.length) {
        camaras = [];
        for (var p = 0; p < ctx.P; p++) {
          var cam = montarCamara(ctx, conCodigo.map(function (l) { return l.codigo[p]; }));
          if (cam.error) {
            errores.push({
              tipo: 'pastilla-imposible',
              cilindro: c.id,
              posicion: p + 1,
              texto: c.id + ', posición ' + (p + 1) + ': no hay pastilla para pasar de la altura ' +
                cam.error.de + ' a la ' + cam.error.a + ' (salto de ' + cam.error.salto + ').'
            });
          }
          if (cam.fantasmas.length) {
            avisos.push({
              tipo: 'corte-fantasma',
              texto: c.id + ', posición ' + (p + 1) + ': la pila crea un corte de más en la altura ' +
                cam.fantasmas.join(' y ') + '.'
            });
          }
          pastillas += cam.pila.length;
          camaras.push(cam);
        }
        teoricas = camaras.reduce(function (acc, cam) { return acc * cam.puntos.length; }, 1);
      }
      var distintos = new Set(conCodigo.map(function (l) { return l.codigo.join('-'); })).size;
      return {
        id: c.id,
        nombre: c.nombre,
        medida: c.medida,
        tipo: c.tipo || '',
        lados: c.lados || 1,
        autorizadas: autorizadas.map(function (l) { return l.id; }),
        camaras: camaras,
        pastillas: pastillas,
        teoricas: teoricas,
        fantasmasLlave: Math.max(0, teoricas - distintos)
      };
    });

    function abre(llave, cil) {
      if (!llave.valida || !cil.camaras) return false;
      for (var p = 0; p < ctx.P; p++) {
        if (cil.camaras[p].puntos.indexOf(llave.codigo[p]) === -1) return false;
      }
      return true;
    }

    var matriz = n.llaves.map(function (l) {
      return cilindros.map(function (c) {
        var autorizada = c.autorizadas.indexOf(l.id) !== -1;
        var resultado = abre(l, c);
        if (l.valida) {
          if (autorizada && !resultado) {
            errores.push({ tipo: 'no-abre', llave: l.id, cilindro: c.id,
              texto: 'La llave ' + l.nombre + ' debería abrir ' + c.id + ' y no lo abre.' });
          } else if (!autorizada && resultado) {
            errores.push({ tipo: 'abre-sin-permiso', llave: l.id, cilindro: c.id,
              texto: 'La llave ' + l.nombre + ' abre ' + c.id + ' (' + c.nombre + ') y no debería.' });
          }
        }
        return { autorizada: autorizada, abre: resultado };
      });
    });

    // Distancias mínimas
    var validas = n.llaves.filter(function (l) { return l.valida; });
    for (var i = 0; i < validas.length; i++) {
      for (var j = i + 1; j < validas.length; j++) {
        var a = validas[i], b = validas[j];
        var d = hamming(a.codigo, b.codigo);
        var minimo = (a.esMaestra || b.esMaestra) ? ctx.minDifMaestra : ctx.minDifLlaves;
        if (d === 0) {
          errores.push({ tipo: 'llaves-iguales', texto: 'Las llaves ' + a.nombre + ' y ' + b.nombre + ' tienen el mismo código.' });
        } else if (d < minimo) {
          avisos.push({ tipo: 'distancia', texto: 'Las llaves ' + a.nombre + ' y ' + b.nombre +
            ' solo se diferencian en ' + d + (d === 1 ? ' posición' : ' posiciones') + ' (mínimo fijado: ' + minimo + ').' });
        }
      }
    }

    // Cilindros que quedan montados igual
    var grupos = {};
    cilindros.forEach(function (c) {
      if (!c.camaras) return;
      var firma = c.camaras.map(function (cam) { return cam.puntos.join('.'); }).join('|');
      (grupos[firma] = grupos[firma] || []).push(c.id);
    });
    Object.keys(grupos).forEach(function (f) {
      if (grupos[f].length > 1) {
        avisos.push({ tipo: 'cilindros-iguales', texto: grupos[f].join(', ') +
          ' quedan montados igual: cualquier llave que abra uno abre los demás. Si cada uno necesita su llave, añade una llave propia.' });
      }
    });

    // Material
    // Pastillas contadas por las alturas que suben (el grosor en mm es opcional)
    var material = { pitones: new Array(ctx.H).fill(0), pastillas: {} };
    sis.pastillas.forEach(function (p) { material.pastillas[p.saltos] = 0; });
    cilindros.forEach(function (c) {
      if (!c.camaras) return;
      c.camaras.forEach(function (cam) {
        material.pitones[cam.base - 1] += c.lados;
        cam.pila.forEach(function (p) { material.pastillas[p.saltos] = (material.pastillas[p.saltos] || 0) + c.lados; });
      });
    });

    var totalPastillas = cilindros.reduce(function (s, c) { return s + c.pastillas; }, 0);
    var totalFantasmas = cilindros.reduce(function (s, c) { return s + c.fantasmasLlave; }, 0);

    return {
      llaves: n.llaves,
      cilindros: cilindros,
      matriz: matriz,
      errores: errores,
      avisos: avisos,
      material: material,
      totalPastillas: totalPastillas,
      totalFantasmas: totalFantasmas,
      ok: errores.length === 0
    };
  }

  /* ---------- generador de códigos ---------- */

  function generar(datos, opciones) {
    opciones = opciones || {};
    var sis = datos.sistema;
    var ctx = contexto(sis);
    var M = datos.maestra;
    if (!codigoValido(M, ctx.P, ctx.H)) {
      return { ok: false, motivo: 'La llave maestra no está completa.' };
    }

    var n = normalizar(datos);
    var cilIds = n.cilindros.map(function (c) { return c.id; });

    // Alturas posibles en cada posición: las que se alcanzan desde la maestra con pastillas.
    var dominio = [];
    for (var p = 0; p < ctx.P; p++) {
      var d = [];
      for (var v = 1; v <= ctx.H; v++) {
        if (v === M[p] || ctx.decomp[Math.abs(v - M[p])]) d.push(v);
      }
      dominio.push(d);
    }

    // Todos los códigos candidatos (producto de dominios), con un tope por seguridad.
    var candidatos = [[]];
    for (p = 0; p < ctx.P; p++) {
      var sig = [];
      for (var i = 0; i < candidatos.length; i++) {
        for (var k = 0; k < dominio[p].length; k++) sig.push(candidatos[i].concat(dominio[p][k]));
      }
      candidatos = sig;
      if (candidatos.length > 250000) break;
    }
    candidatos = candidatos.filter(function (c) {
      return c.length === ctx.P && hamming(c, M) >= ctx.minDifMaestra;
    });

    var fijas = n.llaves.filter(function (l) { return l.fijo && codigoValido(l.codigo, ctx.P, ctx.H); });
    var libres = n.llaves.filter(function (l) { return fijas.indexOf(l) === -1; });

    if (!libres.length) {
      return { ok: true, codigos: {}, intentos: 0, motivo: 'Todas las llaves están fijadas.' };
    }
    if (!candidatos.length) {
      return { ok: false, motivo: 'Con estas pastillas y la diferencia mínima no hay códigos posibles.' };
    }

    var intentosMax = opciones.intentos || 160;
    var limiteNodos = opciones.nodos || 4000;
    var tiempoMax = opciones.tiempoMs || 2500;
    var ramas = opciones.ramas || 3;
    var azar = crearAzar(opciones.semilla || 1);
    var inicio = Date.now();

    var mejor = null;

    for (var intento = 0; intento < intentosMax; intento++) {
      if (Date.now() - inicio > tiempoMax) break;
      var res = intentar();
      if (res) {
        var codigos = res;
        var copia = {
          sistema: sis, maestra: M, cilindros: datos.cilindros,
          llaves: datos.llaves.map(function (l) {
            return { id: l.id, nombre: l.nombre, abre: l.abre, codigo: codigos[l.id] || l.codigo, fijo: l.fijo };
          })
        };
        var an = analizar(copia);
        if (!an.ok) continue;
        var maxPila = 0;
        an.cilindros.forEach(function (c) {
          (c.camaras || []).forEach(function (cam) { maxPila = Math.max(maxPila, cam.pila.length); });
        });
        var puntuacion = an.totalPastillas * 100 + an.totalFantasmas * 2 + maxPila * 30;
        if (!mejor || puntuacion < mejor.puntuacion) {
          mejor = { codigos: codigos, puntuacion: puntuacion, analisis: an };
        }
      }
    }

    if (!mejor) {
      return {
        ok: false,
        motivo: 'No he encontrado una combinación que cumpla el plan con estas reglas. ' +
          'Prueba a bajar la diferencia mínima entre llaves o a desbloquear códigos fijados.'
      };
    }
    return { ok: true, codigos: mejor.codigos, puntuacion: mejor.puntuacion, intentos: intento };

    /* Un intento: asignación voraz con vuelta atrás limitada. */
    function intentar() {
      var codigo = {};
      fijas.forEach(function (l) { codigo[l.id] = l.codigo; });

      var autorizadasPor = {};
      cilIds.forEach(function (id) {
        autorizadasPor[id] = n.llaves.filter(function (l) { return l.abre.indexOf(id) !== -1; });
      });

      var puntos = {};
      function recalcular(cid) {
        var conCodigo = autorizadasPor[cid].filter(function (l) { return codigo[l.id]; });
        var cams = [], error = false;
        for (var q = 0; q < ctx.P; q++) {
          var cam = montarCamara(ctx, conCodigo.map(function (l) { return codigo[l.id][q]; }));
          if (cam.error) error = true;
          cams.push(cam.puntos);
        }
        puntos[cid] = cams;
        return !error;
      }
      cilIds.forEach(recalcular);

      function abreCil(cod, cid) {
        var cams = puntos[cid];
        for (var q = 0; q < ctx.P; q++) if (cams[q].indexOf(cod[q]) === -1) return false;
        return true;
      }

      function valido(llave) {
        var cod = codigo[llave.id];
        var asignadas = n.llaves.filter(function (l) { return codigo[l.id] && l.id !== llave.id; });
        for (var a = 0; a < asignadas.length; a++) {
          var otra = asignadas[a];
          var dist = hamming(cod, codigo[otra.id]);
          var min = otra.esMaestra ? ctx.minDifMaestra : ctx.minDifLlaves;
          if (dist < Math.max(1, min)) return false;
        }
        // Cámaras de los cilindros que abre
        for (var c = 0; c < llave.abre.length; c++) {
          if (!recalcular(llave.abre[c])) return false;
        }
        // Ninguna llave asignada abre lo que no debe en esos cilindros
        for (c = 0; c < llave.abre.length; c++) {
          var cid = llave.abre[c];
          for (a = 0; a < asignadas.length; a++) {
            if (asignadas[a].abre.indexOf(cid) === -1 && abreCil(codigo[asignadas[a].id], cid)) return false;
          }
        }
        // Esta llave no abre cilindros ajenos
        for (c = 0; c < cilIds.length; c++) {
          if (llave.abre.indexOf(cilIds[c]) === -1 && abreCil(cod, cilIds[c])) return false;
        }
        return true;
      }

      function deshacer(llave) {
        delete codigo[llave.id];
        llave.abre.forEach(recalcular);
      }

      var orden = libres.slice().sort(function (a, b) {
        return (b.abre.length - a.abre.length) || (azar() - 0.5);
      });

      var nodos = 0;

      function asignar(i) {
        if (i === orden.length) return true;
        if (nodos++ > limiteNodos) return false;
        var llave = orden[i];
        // Coste: cortes nuevos que añade en los cilindros que abre
        var puntuados = candidatos.map(function (cod) {
          var coste = 0;
          for (var c = 0; c < llave.abre.length; c++) {
            var cams = puntos[llave.abre[c]];
            for (var q = 0; q < ctx.P; q++) if (cams[q].indexOf(cod[q]) === -1) coste++;
          }
          return { cod: cod, coste: coste + azar() * 0.9 };
        });
        puntuados.sort(function (a, b) { return a.coste - b.coste; });

        var probadas = 0;
        for (var c = 0; c < puntuados.length && probadas < ramas; c++) {
          codigo[llave.id] = puntuados[c].cod;
          if (valido(llave)) {
            probadas++;
            if (asignar(i + 1)) return true;
          }
          deshacer(llave);
          if (nodos > limiteNodos) return false;
        }
        return false;
      }

      if (!asignar(0)) return null;
      var salida = {};
      libres.forEach(function (l) { salida[l.id] = codigo[l.id]; });
      return salida;
    }
  }

  return {
    analizar: analizar,
    generar: generar,
    montarCamara: montarCamara,
    hamming: hamming,
    codigoValido: codigoValido,
    _contexto: contexto
  };
});
