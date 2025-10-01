const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Crear conexión a la base de datos
const db = new sqlite3.Database(path.join(__dirname, 'empleados.db'), (err) => {
  if (err) {
    console.error('Error abriendo base de datos:', err.message);
  } else {
    console.log('Conectado a la base de datos SQLite.');
  }
});

// Promisify database methods
const runAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

const getAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const allAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Crear tablas si no existen
const createTables = async () => {
  try {
    // Tabla de empleados
    await runAsync(`
      CREATE TABLE IF NOT EXISTS empleados (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        apellido TEXT NOT NULL,
        horario_normal TEXT NOT NULL,
        horas_esperadas_diarias REAL DEFAULT 8.0,
        horas_esperadas_semanales REAL DEFAULT 40.0,
        activo INTEGER DEFAULT 1,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de fichadas
    await runAsync(`
      CREATE TABLE IF NOT EXISTS fichadas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        empleado_id INTEGER NOT NULL,
        tipo TEXT CHECK(tipo IN ('ingreso', 'salida')) NOT NULL,
        fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
        observaciones TEXT,
        FOREIGN KEY (empleado_id) REFERENCES empleados (id)
      )
    `);

    console.log('Tablas creadas exitosamente');
  } catch (error) {
    console.error('Error creando tablas:', error);
  }
};

// Migración: agregar columnas si no existen
const migrateDatabase = async () => {
  try {
    // Verificar si las columnas existen
    const tableInfo = await allAsync('PRAGMA table_info(empleados)');
    const columnNames = tableInfo.map(col => col.name);

    if (!columnNames.includes('horas_esperadas_diarias')) {
      await runAsync('ALTER TABLE empleados ADD COLUMN horas_esperadas_diarias REAL DEFAULT 8.0');
      console.log('Columna horas_esperadas_diarias agregada');
    }

    if (!columnNames.includes('horas_esperadas_semanales')) {
      await runAsync('ALTER TABLE empleados ADD COLUMN horas_esperadas_semanales REAL DEFAULT 40.0');
      console.log('Columna horas_esperadas_semanales agregada');
    }

    if (!columnNames.includes('hora_entrada_esperada')) {
      await runAsync('ALTER TABLE empleados ADD COLUMN hora_entrada_esperada TEXT DEFAULT "08:00"');
      console.log('Columna hora_entrada_esperada agregada');
    }
  } catch (error) {
    console.error('Error en migración:', error);
  }
};

// Insertar datos de prueba
const insertSampleData = async () => {
  try {
    const empleados = [
      { nombre: 'Juan', apellido: 'Pérez', horario_normal: 'Lunes a Viernes 8:00-17:00', horas_diarias: 8, horas_semanales: 40 },
      { nombre: 'María', apellido: 'González', horario_normal: 'Lunes a Viernes 9:00-18:00', horas_diarias: 8, horas_semanales: 40 },
      { nombre: 'Carlos', apellido: 'López', horario_normal: 'Lunes a Sábado 7:00-15:00', horas_diarias: 8, horas_semanales: 48 }
    ];

    // Verificar si ya hay empleados
    const count = await getAsync('SELECT COUNT(*) as count FROM empleados');

    if (count.count === 0) {
      for (const emp of empleados) {
        await runAsync(
          'INSERT INTO empleados (nombre, apellido, horario_normal, horas_esperadas_diarias, horas_esperadas_semanales) VALUES (?, ?, ?, ?, ?)',
          [emp.nombre, emp.apellido, emp.horario_normal, emp.horas_diarias, emp.horas_semanales]
        );
      }
      console.log('Datos de prueba insertados');
    }
  } catch (error) {
    console.error('Error insertando datos de prueba:', error);
  }
};

// Inicializar base de datos
const initDB = async () => {
  await createTables();
  await migrateDatabase();
  await insertSampleData();
  console.log('Base de datos inicializada correctamente');
};

// Funciones de base de datos
const dbFunctions = {
  // Empleados
  getAllEmpleados: () => allAsync('SELECT * FROM empleados WHERE activo = 1 ORDER BY apellido, nombre'),

  getEmpleadoById: (id) => getAsync('SELECT * FROM empleados WHERE id = ?', [id]),

  insertEmpleado: (nombre, apellido, horario_normal, horas_diarias = 8, horas_semanales = 40, hora_entrada = '08:00') =>
    runAsync('INSERT INTO empleados (nombre, apellido, horario_normal, horas_esperadas_diarias, horas_esperadas_semanales, hora_entrada_esperada) VALUES (?, ?, ?, ?, ?, ?)',
    [nombre, apellido, horario_normal, horas_diarias, horas_semanales, hora_entrada]),

  updateEmpleado: (nombre, apellido, horario_normal, horas_diarias, horas_semanales, hora_entrada, id) =>
    runAsync('UPDATE empleados SET nombre = ?, apellido = ?, horario_normal = ?, horas_esperadas_diarias = ?, horas_esperadas_semanales = ?, hora_entrada_esperada = ? WHERE id = ?',
    [nombre, apellido, horario_normal, horas_diarias, horas_semanales, hora_entrada, id]),

  deleteEmpleado: (id) => runAsync('UPDATE empleados SET activo = 0 WHERE id = ?', [id]),

  // Fichadas
  getAllFichadas: () => allAsync(`
    SELECT
      f.id,
      f.empleado_id,
      f.tipo,
      datetime(f.fecha_hora, '-3 hours') as fecha_hora,
      f.observaciones,
      e.nombre,
      e.apellido
    FROM fichadas f
    JOIN empleados e ON f.empleado_id = e.id
    ORDER BY f.fecha_hora DESC
  `),

  getFichadasByEmpleado: (empleadoId) => allAsync(`
    SELECT
      f.id,
      f.empleado_id,
      f.tipo,
      datetime(f.fecha_hora, '-3 hours') as fecha_hora,
      f.observaciones,
      e.nombre,
      e.apellido
    FROM fichadas f
    JOIN empleados e ON f.empleado_id = e.id
    WHERE f.empleado_id = ?
    ORDER BY f.fecha_hora DESC
  `, [empleadoId]),

  getFichadasByFecha: (fecha) => allAsync(`
    SELECT
      f.id,
      f.empleado_id,
      f.tipo,
      datetime(f.fecha_hora, '-3 hours') as fecha_hora,
      f.observaciones,
      e.nombre,
      e.apellido
    FROM fichadas f
    JOIN empleados e ON f.empleado_id = e.id
    WHERE DATE(f.fecha_hora, '-3 hours') = ?
    ORDER BY f.fecha_hora DESC
  `, [fecha]),

  getUltimaFichada: (empleadoId) => getAsync(`
    SELECT * FROM fichadas
    WHERE empleado_id = ? AND DATE(fecha_hora, '-3 hours') = DATE('now', '-3 hours')
    ORDER BY fecha_hora DESC
    LIMIT 1
  `, [empleadoId]),

  insertFichada: (empleadoId, tipo, observaciones) =>
    runAsync('INSERT INTO fichadas (empleado_id, tipo, observaciones) VALUES (?, ?, ?)',
    [empleadoId, tipo, observaciones || '']),

  // Reportes
  getFichadasDiarias: (fecha) => allAsync(`
    SELECT
      e.id, e.nombre, e.apellido, e.horario_normal,
      GROUP_CONCAT(f.tipo || ':' || TIME(f.fecha_hora, '-3 hours'), ', ') as fichadas
    FROM empleados e
    LEFT JOIN fichadas f ON e.id = f.empleado_id AND DATE(f.fecha_hora, '-3 hours') = ?
    WHERE e.activo = 1
    GROUP BY e.id, e.nombre, e.apellido
    ORDER BY e.apellido, e.nombre
  `, [fecha]),

  getFichadasSemanales: (fechaInicio, fechaFin) => allAsync(`
    SELECT
      e.id, e.nombre, e.apellido,
      COUNT(CASE WHEN f.tipo = 'ingreso' THEN 1 END) as dias_trabajados,
      DATE(f.fecha_hora, '-3 hours') as fecha,
      GROUP_CONCAT(f.tipo || ':' || TIME(f.fecha_hora, '-3 hours'), ', ') as fichadas_dia
    FROM empleados e
    LEFT JOIN fichadas f ON e.id = f.empleado_id
    WHERE e.activo = 1 AND DATE(f.fecha_hora, '-3 hours') BETWEEN ? AND ?
    GROUP BY e.id, DATE(f.fecha_hora, '-3 hours')
    ORDER BY e.apellido, e.nombre, fecha
  `, [fechaInicio, fechaFin]),

  // Reporte personalizado con cálculo de horas (un empleado)
  getReportePersonalizado: async (empleadoId, fechaInicio, fechaFin) => {
    const query = `
      SELECT
        DATE(f.fecha_hora, '-3 hours') as fecha,
        MIN(CASE WHEN f.tipo = 'ingreso' THEN TIME(f.fecha_hora, '-3 hours') END) as hora_entrada,
        MAX(CASE WHEN f.tipo = 'salida' THEN TIME(f.fecha_hora, '-3 hours') END) as hora_salida,
        MIN(CASE WHEN f.tipo = 'ingreso' THEN datetime(f.fecha_hora, '-3 hours') END) as fecha_hora_entrada,
        MAX(CASE WHEN f.tipo = 'salida' THEN datetime(f.fecha_hora, '-3 hours') END) as fecha_hora_salida
      FROM fichadas f
      WHERE f.empleado_id = ?
        AND DATE(f.fecha_hora, '-3 hours') BETWEEN ? AND ?
      GROUP BY DATE(f.fecha_hora, '-3 hours')
      ORDER BY fecha
    `;

    return allAsync(query, [empleadoId, fechaInicio, fechaFin]);
  },

  // Reporte personalizado con cálculo de horas (todos los empleados)
  getReporteTodosEmpleados: async (fechaInicio, fechaFin) => {
    const query = `
      SELECT
        e.id as empleado_id,
        e.nombre,
        e.apellido,
        e.horas_esperadas_diarias,
        e.horas_esperadas_semanales,
        DATE(f.fecha_hora, '-3 hours') as fecha,
        MIN(CASE WHEN f.tipo = 'ingreso' THEN TIME(f.fecha_hora, '-3 hours') END) as hora_entrada,
        MAX(CASE WHEN f.tipo = 'salida' THEN TIME(f.fecha_hora, '-3 hours') END) as hora_salida
      FROM empleados e
      LEFT JOIN fichadas f ON e.id = f.empleado_id
        AND DATE(f.fecha_hora, '-3 hours') BETWEEN ? AND ?
      WHERE e.activo = 1
      GROUP BY e.id, DATE(f.fecha_hora, '-3 hours')
      ORDER BY e.apellido, e.nombre, fecha
    `;

    return allAsync(query, [fechaInicio, fechaFin]);
  },

  // Obtener cumplimiento de últimos 10 días para un empleado
  getCumplimientoUltimos10Dias: async (empleadoId) => {
    const query = `
      SELECT
        DATE(f.fecha_hora, '-3 hours') as fecha,
        MIN(CASE WHEN f.tipo = 'ingreso' THEN TIME(f.fecha_hora, '-3 hours') END) as hora_entrada,
        MAX(CASE WHEN f.tipo = 'salida' THEN TIME(f.fecha_hora, '-3 hours') END) as hora_salida
      FROM fichadas f
      WHERE f.empleado_id = ?
        AND DATE(f.fecha_hora, '-3 hours') >= DATE('now', '-3 hours', '-10 days')
        AND DATE(f.fecha_hora, '-3 hours') <= DATE('now', '-3 hours')
      GROUP BY DATE(f.fecha_hora, '-3 hours')
      ORDER BY fecha DESC
      LIMIT 10
    `;

    return allAsync(query, [empleadoId]);
  },

  // Obtener estado diario de hoy para todos los empleados
  getEstadoDiarioEmpleados: async () => {
    const query = `
      SELECT
        e.id as empleado_id,
        e.nombre,
        e.apellido,
        e.horario_normal,
        e.horas_esperadas_diarias,
        MIN(CASE WHEN f.tipo = 'ingreso' THEN TIME(f.fecha_hora, '-3 hours') END) as hora_entrada,
        MAX(CASE WHEN f.tipo = 'salida' THEN TIME(f.fecha_hora, '-3 hours') END) as hora_salida,
        MIN(CASE WHEN f.tipo = 'ingreso' THEN f.fecha_hora END) as fecha_hora_entrada
      FROM empleados e
      LEFT JOIN fichadas f ON e.id = f.empleado_id
        AND DATE(f.fecha_hora, '-3 hours') = DATE('now', '-3 hours')
      WHERE e.activo = 1
      GROUP BY e.id
      ORDER BY e.apellido, e.nombre
    `;

    return allAsync(query);
  }
};

// Función auxiliar para calcular horas trabajadas
const calcularHorasTrabajadas = (horaEntrada, horaSalida) => {
  if (!horaEntrada || !horaSalida) return 0;

  const [hE, mE, sE] = horaEntrada.split(':').map(Number);
  const [hS, mS, sS] = horaSalida.split(':').map(Number);

  const minutosEntrada = hE * 60 + mE;
  const minutosSalida = hS * 60 + mS;

  const minutostrabajados = minutosSalida - minutosEntrada;
  return Number((minutostrabajados / 60).toFixed(2));
};

module.exports = {
  db,
  dbFunctions,
  initDB,
  calcularHorasTrabajadas
};