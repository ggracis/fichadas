const express = require('express');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const ExcelJS = require('exceljs');
const { dbFunctions, initDB, calcularHorasTrabajadas } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// Configurar zona horaria Argentina (UTC-3)
process.env.TZ = 'America/Argentina/Buenos_Aires';

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static('../frontend/dist'));

// Configuración de email (actualizar con credenciales reales)
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER || 'admin@empresa.com',
    pass: process.env.EMAIL_PASS || 'password'
  }
});

// Inicializar base de datos
initDB();

// RUTAS DE EMPLEADOS

// Obtener todos los empleados
app.get('/api/empleados', async (req, res) => {
  try {
    const empleados = await dbFunctions.getAllEmpleados();
    res.json(empleados);
  } catch (error) {
    console.error('Error obteniendo empleados:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener cumplimiento de últimos 10 días para todos los empleados
app.get('/api/empleados/cumplimiento', async (req, res) => {
  try {
    const empleados = await dbFunctions.getAllEmpleados();

    const cumplimientos = await Promise.all(
      empleados.map(async (empleado) => {
        const fichadas = await dbFunctions.getCumplimientoUltimos10Dias(empleado.id);

        let diasCumplidos = 0;
        let totalDias = 0;

        fichadas.forEach(dia => {
          const horasTrabajadas = calcularHorasTrabajadas(dia.hora_entrada, dia.hora_salida);
          const horasEsperadas = empleado.horas_esperadas_diarias || 8;

          if (horasTrabajadas > 0) {
            totalDias++;
            if (horasTrabajadas >= horasEsperadas) {
              diasCumplidos++;
            }
          }
        });

        const porcentajeCumplimiento = totalDias > 0 ? (diasCumplidos / totalDias) * 100 : 0;

        return {
          empleado_id: empleado.id,
          porcentaje: porcentajeCumplimiento.toFixed(0),
          dias_trabajados: totalDias,
          dias_cumplidos: diasCumplidos,
          estado: porcentajeCumplimiento >= 90 ? 'excelente' :
                  porcentajeCumplimiento >= 70 ? 'bueno' : 'bajo'
        };
      })
    );

    res.json(cumplimientos);
  } catch (error) {
    console.error('Error obteniendo cumplimiento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener estado diario de todos los empleados (hoy)
app.get('/api/empleados/estado-diario', async (req, res) => {
  try {
    const estadoDiario = await dbFunctions.getEstadoDiarioEmpleados();

    const estados = estadoDiario.map(emp => {
      const horasTrabajadas = calcularHorasTrabajadas(emp.hora_entrada, emp.hora_salida);

      // Determinar estado de puntualidad
      let estadoPuntualidad = 'ausente'; // Por defecto ausente
      let horarioEsperado = null;

      // Intentar extraer hora de entrada del horario_normal
      // Formato esperado: "Lunes a Viernes 8:00-17:00" o "L-V 08:00-17:00"
      const match = emp.horario_normal.match(/(\d{1,2}):(\d{2})/);
      if (match) {
        horarioEsperado = `${match[1].padStart(2, '0')}:${match[2]}`;
      }

      if (emp.hora_entrada) {
        if (horarioEsperado) {
          const [horaEsp, minEsp] = horarioEsperado.split(':').map(Number);
          const [horaReal, minReal] = emp.hora_entrada.split(':').map(Number);

          const minutosEsperados = horaEsp * 60 + minEsp;
          const minutosReales = horaReal * 60 + minReal;

          // Tolerancia de 10 minutos
          if (minutosReales <= minutosEsperados + 10) {
            estadoPuntualidad = 'a_tiempo';
          } else {
            estadoPuntualidad = 'tarde';
          }
        } else {
          estadoPuntualidad = 'presente'; // No se puede determinar horario
        }
      }

      return {
        empleado_id: emp.empleado_id,
        hora_entrada: emp.hora_entrada || null,
        hora_salida: emp.hora_salida || null,
        horas_trabajadas: horasTrabajadas,
        estado_puntualidad: estadoPuntualidad,
        horario_esperado: horarioEsperado
      };
    });

    res.json(estados);
  } catch (error) {
    console.error('Error obteniendo estado diario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener empleado por ID
app.get('/api/empleados/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const empleado = await dbFunctions.getEmpleadoById(id);

    if (!empleado) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    res.json(empleado);
  } catch (error) {
    console.error('Error obteniendo empleado:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear nuevo empleado
app.post('/api/empleados', async (req, res) => {
  try {
    const { nombre, apellido, horario_normal, horas_esperadas_diarias, horas_esperadas_semanales } = req.body;

    if (!nombre || !apellido || !horario_normal) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    const result = await dbFunctions.insertEmpleado(
      nombre,
      apellido,
      horario_normal,
      horas_esperadas_diarias || 8,
      horas_esperadas_semanales || 40
    );

    res.status(201).json({
      id: result.lastID,
      nombre,
      apellido,
      horario_normal,
      horas_esperadas_diarias: horas_esperadas_diarias || 8,
      horas_esperadas_semanales: horas_esperadas_semanales || 40,
      message: 'Empleado creado exitosamente'
    });
  } catch (error) {
    console.error('Error creando empleado:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar empleado
app.put('/api/empleados/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, horario_normal, horas_esperadas_diarias, horas_esperadas_semanales } = req.body;

    if (!nombre || !apellido || !horario_normal) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    const result = await dbFunctions.updateEmpleado(
      nombre,
      apellido,
      horario_normal,
      horas_esperadas_diarias || 8,
      horas_esperadas_semanales || 40,
      id
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    res.json({ message: 'Empleado actualizado exitosamente' });
  } catch (error) {
    console.error('Error actualizando empleado:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Eliminar empleado (soft delete)
app.delete('/api/empleados/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await dbFunctions.deleteEmpleado(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    res.json({ message: 'Empleado eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando empleado:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// RUTAS DE FICHADAS

// Obtener todas las fichadas
app.get('/api/fichadas', async (req, res) => {
  try {
    const { empleado_id, fecha } = req.query;
    let fichadas;

    if (empleado_id) {
      fichadas = await dbFunctions.getFichadasByEmpleado(empleado_id);
    } else if (fecha) {
      fichadas = await dbFunctions.getFichadasByFecha(fecha);
    } else {
      fichadas = await dbFunctions.getAllFichadas();
    }

    res.json(fichadas);
  } catch (error) {
    console.error('Error obteniendo fichadas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Registrar fichada
app.post('/api/fichadas', async (req, res) => {
  try {
    const { empleado_id, observaciones } = req.body;

    if (!empleado_id) {
      return res.status(400).json({ error: 'ID de empleado es obligatorio' });
    }

    // Verificar si el empleado existe
    const empleado = await dbFunctions.getEmpleadoById(empleado_id);
    if (!empleado) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    // Obtener la última fichada del día
    const ultimaFichada = await dbFunctions.getUltimaFichada(empleado_id);

    // Determinar el tipo de fichada
    let tipo = 'ingreso';
    let horasTrabajadas = null;
    let mensajeExtra = '';

    if (ultimaFichada && ultimaFichada.tipo === 'ingreso') {
      tipo = 'salida';

      // Calcular horas trabajadas
      const horaEntrada = ultimaFichada.fecha_hora.split(' ')[1];
      const horaSalida = new Date().toTimeString().split(' ')[0];
      horasTrabajadas = calcularHorasTrabajadas(horaEntrada, horaSalida);

      mensajeExtra = `¡Gracias por tu trabajo! Hoy trabajaste ${horasTrabajadas} horas.`;
    }

    // Insertar fichada
    const result = await dbFunctions.insertFichada(empleado_id, tipo, observaciones || '');

    res.status(201).json({
      id: result.lastID,
      empleado_id,
      tipo,
      empleado: `${empleado.nombre} ${empleado.apellido}`,
      horas_trabajadas: horasTrabajadas,
      message: mensajeExtra || `Fichada de ${tipo} registrada exitosamente`
    });
  } catch (error) {
    console.error('Error registrando fichada:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Verificar estado de fichada de empleado
app.get('/api/fichadas/estado/:empleado_id', async (req, res) => {
  try {
    const { empleado_id } = req.params;
    const ultimaFichada = await dbFunctions.getUltimaFichada(empleado_id);

    let proximoTipo = 'ingreso';
    if (ultimaFichada && ultimaFichada.tipo === 'ingreso') {
      proximoTipo = 'salida';
    }

    res.json({
      ultima_fichada: ultimaFichada,
      proximo_tipo: proximoTipo
    });
  } catch (error) {
    console.error('Error verificando estado:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// RUTAS DE REPORTES

// Reporte diario
app.get('/api/reportes/diario', async (req, res) => {
  try {
    const { fecha } = req.query;
    const fechaReporte = fecha || new Date().toISOString().split('T')[0];

    const reporte = await dbFunctions.getFichadasDiarias(fechaReporte);

    res.json({
      fecha: fechaReporte,
      empleados: reporte
    });
  } catch (error) {
    console.error('Error generando reporte diario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Reporte semanal
app.get('/api/reportes/semanal', async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;

    // Si no se especifican fechas, usar la semana actual
    const hoy = new Date();
    const inicioSemana = fecha_inicio || new Date(hoy.setDate(hoy.getDate() - hoy.getDay())).toISOString().split('T')[0];
    const finSemana = fecha_fin || new Date(hoy.setDate(hoy.getDate() - hoy.getDay() + 6)).toISOString().split('T')[0];

    const reporte = await dbFunctions.getFichadasSemanales(inicioSemana, finSemana);

    res.json({
      fecha_inicio: inicioSemana,
      fecha_fin: finSemana,
      empleados: reporte
    });
  } catch (error) {
    console.error('Error generando reporte semanal:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Reporte personalizado con cálculo de horas
app.get('/api/reportes/personalizado', async (req, res) => {
  try {
    const { empleado_id, fecha_inicio, fecha_fin } = req.query;

    if (!fecha_inicio || !fecha_fin) {
      return res.status(400).json({ error: 'Fecha inicio y fecha fin son requeridos' });
    }

    // Si no hay empleado_id, generar reporte de TODOS los empleados
    if (!empleado_id) {
      const fichadasTodos = await dbFunctions.getReporteTodosEmpleados(fecha_inicio, fecha_fin);

      // Agrupar por empleado
      const empleadosMap = {};

      fichadasTodos.forEach(registro => {
        if (!empleadosMap[registro.empleado_id]) {
          empleadosMap[registro.empleado_id] = {
            empleado: {
              id: registro.empleado_id,
              nombre: registro.nombre,
              apellido: registro.apellido,
              horas_esperadas_diarias: registro.horas_esperadas_diarias,
              horas_esperadas_semanales: registro.horas_esperadas_semanales
            },
            detalles: [],
            totalHoras: 0,
            diasConDatos: 0
          };
        }

        if (registro.fecha) {
          const horasTrabajadas = calcularHorasTrabajadas(registro.hora_entrada, registro.hora_salida);
          const horasEsperadas = registro.horas_esperadas_diarias || 8;
          const diferencia = horasTrabajadas - horasEsperadas;

          if (horasTrabajadas > 0) {
            empleadosMap[registro.empleado_id].totalHoras += horasTrabajadas;
            empleadosMap[registro.empleado_id].diasConDatos++;
          }

          empleadosMap[registro.empleado_id].detalles.push({
            fecha: registro.fecha,
            hora_entrada: registro.hora_entrada || 'Sin registro',
            hora_salida: registro.hora_salida || 'Sin registro',
            horas_trabajadas: horasTrabajadas,
            horas_esperadas: horasEsperadas,
            diferencia: diferencia,
            cumplimiento: horasTrabajadas >= horasEsperadas
          });
        }
      });

      // Calcular resúmenes
      const empleados = Object.values(empleadosMap).map(emp => ({
        empleado: emp.empleado,
        resumen: {
          total_horas: emp.totalHoras.toFixed(2),
          dias_trabajados: emp.diasConDatos,
          promedio_diario: emp.diasConDatos > 0 ? (emp.totalHoras / emp.diasConDatos).toFixed(2) : '0.00',
          horas_esperadas_totales: (emp.empleado.horas_esperadas_diarias * emp.diasConDatos).toFixed(2),
          diferencia_total: (emp.totalHoras - (emp.empleado.horas_esperadas_diarias * emp.diasConDatos)).toFixed(2)
        },
        detalles: emp.detalles
      }));

      return res.json({
        periodo: { fecha_inicio, fecha_fin },
        empleados
      });
    }

    // Reporte de UN solo empleado
    const empleado = await dbFunctions.getEmpleadoById(empleado_id);
    if (!empleado) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    const fichadas = await dbFunctions.getReportePersonalizado(empleado_id, fecha_inicio, fecha_fin);

    let totalHoras = 0;
    let diasConDatos = 0;

    const detalles = fichadas.map(dia => {
      const horasTrabajadas = calcularHorasTrabajadas(dia.hora_entrada, dia.hora_salida);
      const horasEsperadas = empleado.horas_esperadas_diarias || 8;
      const diferencia = horasTrabajadas - horasEsperadas;

      if (horasTrabajadas > 0) {
        totalHoras += horasTrabajadas;
        diasConDatos++;
      }

      return {
        fecha: dia.fecha,
        hora_entrada: dia.hora_entrada || 'Sin registro',
        hora_salida: dia.hora_salida || 'Sin registro',
        horas_trabajadas: horasTrabajadas,
        horas_esperadas: horasEsperadas,
        diferencia: diferencia,
        cumplimiento: horasTrabajadas >= horasEsperadas
      };
    });

    const promedioDiario = diasConDatos > 0 ? (totalHoras / diasConDatos).toFixed(2) : 0;

    res.json({
      empleado: {
        id: empleado.id,
        nombre: empleado.nombre,
        apellido: empleado.apellido,
        horas_esperadas_diarias: empleado.horas_esperadas_diarias,
        horas_esperadas_semanales: empleado.horas_esperadas_semanales
      },
      periodo: {
        fecha_inicio,
        fecha_fin
      },
      resumen: {
        total_horas: totalHoras.toFixed(2),
        dias_trabajados: diasConDatos,
        promedio_diario: promedioDiario,
        horas_esperadas_totales: (empleado.horas_esperadas_diarias * diasConDatos).toFixed(2),
        diferencia_total: (totalHoras - (empleado.horas_esperadas_diarias * diasConDatos)).toFixed(2)
      },
      detalles
    });
  } catch (error) {
    console.error('Error generando reporte personalizado:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Exportar reporte a Excel
app.get('/api/reportes/exportar-excel', async (req, res) => {
  try {
    const { empleado_id, fecha_inicio, fecha_fin } = req.query;

    if (!fecha_inicio || !fecha_fin) {
      return res.status(400).json({ error: 'Fecha inicio y fecha fin son requeridos' });
    }

    // Crear libro de Excel
    const workbook = new ExcelJS.Workbook();

    // Si NO hay empleado_id, generar Excel de TODOS los empleados
    if (!empleado_id) {
      const fichadasTodos = await dbFunctions.getReporteTodosEmpleados(fecha_inicio, fecha_fin);

      // Agrupar por empleado
      const empleadosMap = {};
      fichadasTodos.forEach(registro => {
        if (!empleadosMap[registro.empleado_id]) {
          empleadosMap[registro.empleado_id] = {
            empleado: {
              id: registro.empleado_id,
              nombre: registro.nombre,
              apellido: registro.apellido,
              horas_esperadas_diarias: registro.horas_esperadas_diarias
            },
            fichadas: []
          };
        }
        if (registro.fecha) {
          empleadosMap[registro.empleado_id].fichadas.push(registro);
        }
      });

      // Crear una hoja por empleado
      Object.values(empleadosMap).forEach(emp => {
        const worksheet = workbook.addWorksheet(`${emp.empleado.apellido} ${emp.empleado.nombre}`.substring(0, 30));

        // Título
        worksheet.mergeCells('A1:G1');
        worksheet.getCell('A1').value = `${emp.empleado.apellido}, ${emp.empleado.nombre}`;
        worksheet.getCell('A1').font = { bold: true, size: 14 };
        worksheet.getCell('A1').alignment = { horizontal: 'center' };

        // Período
        worksheet.mergeCells('A2:G2');
        worksheet.getCell('A2').value = `Período: ${fecha_inicio} a ${fecha_fin}`;
        worksheet.getCell('A2').alignment = { horizontal: 'center' };

        // Encabezados
        worksheet.getRow(4).values = [
          'Fecha', 'Hora Entrada', 'Hora Salida', 'Horas Trabajadas',
          'Horas Esperadas', 'Diferencia', 'Estado'
        ];
        worksheet.getRow(4).font = { bold: true };
        worksheet.getRow(4).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD9D9D9' }
        };

        // Datos
        let totalHoras = 0;
        let diasConDatos = 0;
        let fila = 5;

        emp.fichadas.forEach(dia => {
          const horasTrabajadas = calcularHorasTrabajadas(dia.hora_entrada, dia.hora_salida);
          const horasEsperadas = emp.empleado.horas_esperadas_diarias || 8;
          const diferencia = horasTrabajadas - horasEsperadas;
          const cumple = horasTrabajadas >= horasEsperadas;

          if (horasTrabajadas > 0) {
            totalHoras += horasTrabajadas;
            diasConDatos++;
          }

          const row = worksheet.getRow(fila);
          row.values = [
            dia.fecha,
            dia.hora_entrada || 'Sin registro',
            dia.hora_salida || 'Sin registro',
            horasTrabajadas,
            horasEsperadas,
            diferencia.toFixed(2),
            cumple ? 'Cumplió' : 'No cumplió'
          ];

          if (horasTrabajadas > 0) {
            row.getCell(7).fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: cumple ? 'FF90EE90' : 'FFFFCCCB' }
            };
          }

          fila++;
        });

        // Resumen
        fila++;
        worksheet.getCell(`A${fila}`).value = 'RESUMEN';
        worksheet.getCell(`A${fila}`).font = { bold: true };

        fila++;
        worksheet.getCell(`A${fila}`).value = 'Total Horas Trabajadas:';
        worksheet.getCell(`B${fila}`).value = totalHoras.toFixed(2);

        fila++;
        worksheet.getCell(`A${fila}`).value = 'Días Trabajados:';
        worksheet.getCell(`B${fila}`).value = diasConDatos;

        fila++;
        worksheet.getCell(`A${fila}`).value = 'Promedio Diario:';
        worksheet.getCell(`B${fila}`).value = diasConDatos > 0 ? (totalHoras / diasConDatos).toFixed(2) : 0;

        // Ajustar anchos
        worksheet.columns.forEach((column, i) => {
          column.width = i === 0 ? 12 : 15;
        });
      });

      // Enviar archivo
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=reporte_todos_${fecha_inicio}_${fecha_fin}.xlsx`
      );

      await workbook.xlsx.write(res);
      return res.end();
    }

    // Obtener datos del reporte para UN empleado
    const empleado = await dbFunctions.getEmpleadoById(empleado_id);
    if (!empleado) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    const fichadas = await dbFunctions.getReportePersonalizado(empleado_id, fecha_inicio, fecha_fin);

    // Crear hoja en el workbook existente
    const worksheet = workbook.addWorksheet('Reporte de Fichadas');

    // Título
    worksheet.mergeCells('A1:G1');
    worksheet.getCell('A1').value = `Reporte de Fichadas - ${empleado.nombre} ${empleado.apellido}`;
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    // Período
    worksheet.mergeCells('A2:G2');
    worksheet.getCell('A2').value = `Período: ${fecha_inicio} a ${fecha_fin}`;
    worksheet.getCell('A2').alignment = { horizontal: 'center' };

    // Encabezados
    worksheet.getRow(4).values = [
      'Fecha',
      'Hora Entrada',
      'Hora Salida',
      'Horas Trabajadas',
      'Horas Esperadas',
      'Diferencia',
      'Estado'
    ];
    worksheet.getRow(4).font = { bold: true };
    worksheet.getRow(4).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9D9D9' }
    };

    // Datos
    let totalHoras = 0;
    let diasConDatos = 0;
    let fila = 5;

    fichadas.forEach(dia => {
      const horasTrabajadas = calcularHorasTrabajadas(dia.hora_entrada, dia.hora_salida);
      const horasEsperadas = empleado.horas_esperadas_diarias || 8;
      const diferencia = horasTrabajadas - horasEsperadas;
      const cumple = horasTrabajadas >= horasEsperadas;

      if (horasTrabajadas > 0) {
        totalHoras += horasTrabajadas;
        diasConDatos++;
      }

      const row = worksheet.getRow(fila);
      row.values = [
        dia.fecha,
        dia.hora_entrada || 'Sin registro',
        dia.hora_salida || 'Sin registro',
        horasTrabajadas,
        horasEsperadas,
        diferencia.toFixed(2),
        cumple ? 'Cumplió' : 'No cumplió'
      ];

      // Color según cumplimiento
      if (horasTrabajadas > 0) {
        row.getCell(7).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: cumple ? 'FF90EE90' : 'FFFFCCCB' }
        };
      }

      fila++;
    });

    // Resumen
    fila++;
    worksheet.getCell(`A${fila}`).value = 'RESUMEN';
    worksheet.getCell(`A${fila}`).font = { bold: true };

    fila++;
    worksheet.getCell(`A${fila}`).value = 'Total Horas Trabajadas:';
    worksheet.getCell(`B${fila}`).value = totalHoras.toFixed(2);

    fila++;
    worksheet.getCell(`A${fila}`).value = 'Días Trabajados:';
    worksheet.getCell(`B${fila}`).value = diasConDatos;

    fila++;
    worksheet.getCell(`A${fila}`).value = 'Promedio Diario:';
    worksheet.getCell(`B${fila}`).value = diasConDatos > 0 ? (totalHoras / diasConDatos).toFixed(2) : 0;

    fila++;
    worksheet.getCell(`A${fila}`).value = 'Horas Esperadas Totales:';
    worksheet.getCell(`B${fila}`).value = (empleado.horas_esperadas_diarias * diasConDatos).toFixed(2);

    fila++;
    worksheet.getCell(`A${fila}`).value = 'Diferencia Total:';
    worksheet.getCell(`B${fila}`).value = (totalHoras - (empleado.horas_esperadas_diarias * diasConDatos)).toFixed(2);

    // Ajustar anchos de columna
    worksheet.columns.forEach((column, i) => {
      column.width = i === 0 ? 12 : 15;
    });

    // Enviar archivo
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=reporte_${empleado.apellido}_${fecha_inicio}_${fecha_fin}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exportando a Excel:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// FUNCIONES DE EMAIL

// Función para enviar reporte diario por email
const enviarReporteDiario = async () => {
  try {
    const fechaHoy = new Date().toISOString().split('T')[0];
    const reporte = await dbFunctions.getFichadasDiarias(fechaHoy);

    let contenido = `REPORTE DIARIO - ${fechaHoy}\n\n`;
    contenido += '='.repeat(50) + '\n\n';

    reporte.forEach(emp => {
      contenido += `${emp.apellido}, ${emp.nombre}\n`;
      contenido += `Horario: ${emp.horario_normal}\n`;
      contenido += `Fichadas: ${emp.fichadas || 'Sin fichadas'}\n`;
      contenido += '-'.repeat(30) + '\n';
    });

    const mailOptions = {
      from: process.env.EMAIL_USER || 'admin@empresa.com',
      to: 'admin@empresa.com',
      subject: `Reporte Diario de Fichadas - ${fechaHoy}`,
      text: contenido
    };

    await transporter.sendMail(mailOptions);
    console.log('Reporte diario enviado por email');
  } catch (error) {
    console.error('Error enviando reporte diario:', error);
  }
};

// Función para enviar reporte semanal por email
const enviarReporteSemanal = async () => {
  try {
    const hoy = new Date();
    const inicioSemana = new Date(hoy.setDate(hoy.getDate() - hoy.getDay() - 7)).toISOString().split('T')[0];
    const finSemana = new Date(hoy.setDate(hoy.getDate() - hoy.getDay() - 1)).toISOString().split('T')[0];

    const reporte = await dbFunctions.getFichadasSemanales(inicioSemana, finSemana);

    let contenido = `REPORTE SEMANAL - ${inicioSemana} al ${finSemana}\n\n`;
    contenido += '='.repeat(50) + '\n\n';

    // Agrupar por empleado
    const empleadosMap = {};
    reporte.forEach(item => {
      if (!empleadosMap[item.id]) {
        empleadosMap[item.id] = {
          nombre: `${item.apellido}, ${item.nombre}`,
          dias: []
        };
      }
      if (item.fecha) {
        empleadosMap[item.id].dias.push({
          fecha: item.fecha,
          fichadas: item.fichadas_dia
        });
      }
    });

    Object.values(empleadosMap).forEach(emp => {
      contenido += `${emp.nombre}\n`;
      contenido += `Días trabajados: ${emp.dias.length}\n`;
      emp.dias.forEach(dia => {
        contenido += `  ${dia.fecha}: ${dia.fichadas || 'Sin fichadas'}\n`;
      });
      contenido += '-'.repeat(30) + '\n';
    });

    const mailOptions = {
      from: process.env.EMAIL_USER || 'admin@empresa.com',
      to: 'admin@empresa.com',
      subject: `Reporte Semanal de Fichadas - ${inicioSemana} al ${finSemana}`,
      text: contenido
    };

    await transporter.sendMail(mailOptions);
    console.log('Reporte semanal enviado por email');
  } catch (error) {
    console.error('Error enviando reporte semanal:', error);
  }
};

// CRON JOBS

// Reporte diario todos los días a las 20:00
cron.schedule('0 20 * * *', () => {
  console.log('Ejecutando envío de reporte diario...');
  enviarReporteDiario();
});

// Reporte semanal todos los lunes a las 9:00
cron.schedule('0 9 * * 1', () => {
  console.log('Ejecutando envío de reporte semanal...');
  enviarReporteSemanal();
});

// RUTA DE PRUEBA PARA EMAILS (solo desarrollo)
app.post('/api/test-email/diario', async (req, res) => {
  try {
    await enviarReporteDiario();
    res.json({ message: 'Reporte diario enviado' });
  } catch (error) {
    res.status(500).json({ error: 'Error enviando email' });
  }
});

app.post('/api/test-email/semanal', async (req, res) => {
  try {
    await enviarReporteSemanal();
    res.json({ message: 'Reporte semanal enviado' });
  } catch (error) {
    res.status(500).json({ error: 'Error enviando email' });
  }
});

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Algo salió mal!' });
});

// SPA fallback - todas las rutas no-API sirven index.html
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en puerto ${PORT}`);
  console.log(`API disponible en http://localhost:${PORT}/api`);
});