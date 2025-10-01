import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useEmpleados, useFichadas, useReportes } from '@/hooks/useApi';
import { formatDateTime, formatDate } from '@/lib/utils';
import {
  Plus,
  Edit,
  Trash2,
  Users,
  FileText,
  Calendar,
  Download,
  Home,
  Clock
} from 'lucide-react';

const PanelAdmin = () => {
  const { empleados, loading, cumplimientos, estadoDiario, createEmpleado, updateEmpleado, deleteEmpleado } = useEmpleados();
  const { fichadas, fetchFichadas } = useFichadas();
  const { fetchReporteDiario, fetchReporteSemanal } = useReportes();

  const [activeTab, setActiveTab] = useState('empleados');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmpleado, setEditingEmpleado] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    horario_normal: '',
    horas_esperadas_diarias: 8,
    horas_esperadas_semanales: 40
  });
  const [reporteData, setReporteData] = useState(null);
  const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().split('T')[0]);
  const [notification, setNotification] = useState('');

  // Estados para reporte personalizado
  const [reportePersonalizado, setReportePersonalizado] = useState(null);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState('');
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0]);
  const [fechaFin, setFechaFin] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (activeTab === 'fichadas') {
      fetchFichadas();
    }
  }, [activeTab]);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(''), 5000);
  };

  const handleSubmitEmpleado = async (e) => {
    e.preventDefault();
    try {
      if (editingEmpleado) {
        await updateEmpleado(editingEmpleado.id, formData);
        showNotification('Empleado actualizado exitosamente');
      } else {
        await createEmpleado(formData);
        showNotification('Empleado creado exitosamente');
      }
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      showNotification(error.message, 'error');
    }
  };

  const handleDeleteEmpleado = async (id) => {
    if (window.confirm('¿Está seguro de eliminar este empleado?')) {
      try {
        await deleteEmpleado(id);
        showNotification('Empleado eliminado exitosamente');
      } catch (error) {
        showNotification(error.message, 'error');
      }
    }
  };

  const handleEditEmpleado = (empleado) => {
    setEditingEmpleado(empleado);
    setFormData({
      nombre: empleado.nombre,
      apellido: empleado.apellido,
      horario_normal: empleado.horario_normal,
      horas_esperadas_diarias: empleado.horas_esperadas_diarias || 8,
      horas_esperadas_semanales: empleado.horas_esperadas_semanales || 40
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      apellido: '',
      horario_normal: '',
      horas_esperadas_diarias: 8,
      horas_esperadas_semanales: 40
    });
    setEditingEmpleado(null);
  };

  const handleGenerarReporte = async (tipo) => {
    try {
      let data;
      if (tipo === 'diario') {
        data = await fetchReporteDiario(fechaFiltro);
      } else {
        const hoy = new Date();
        const inicioSemana = new Date(hoy.setDate(hoy.getDate() - hoy.getDay()));
        const finSemana = new Date(hoy.setDate(hoy.getDate() - hoy.getDay() + 6));
        data = await fetchReporteSemanal(
          inicioSemana.toISOString().split('T')[0],
          finSemana.toISOString().split('T')[0]
        );
      }
      setReporteData(data);
      showNotification(`Reporte ${tipo} generado exitosamente`);
    } catch (error) {
      showNotification(error.message, 'error');
    }
  };

  const handleGenerarReportePersonalizado = async () => {
    try {
      const url = empleadoSeleccionado
        ? `/api/reportes/personalizado?empleado_id=${empleadoSeleccionado}&fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`
        : `/api/reportes/personalizado?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`;

      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        setReportePersonalizado(data);
        showNotification('Reporte personalizado generado exitosamente');
      } else {
        throw new Error(data.error || 'Error generando reporte');
      }
    } catch (error) {
      showNotification(error.message, 'error');
    }
  };

  const handleDescargarExcel = () => {
    const url = empleadoSeleccionado
      ? `/api/reportes/exportar-excel?empleado_id=${empleadoSeleccionado}&fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`
      : `/api/reportes/exportar-excel?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`;

    window.open(url, '_blank');
  };

  const tabs = [
    { id: 'empleados', label: 'Empleados', icon: Users },
    { id: 'fichadas', label: 'Fichadas', icon: Clock },
    { id: 'reportes', label: 'Reportes', icon: FileText },
    { id: 'ayuda', label: 'Ayuda', icon: Calendar }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Notificación */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white`}>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">Panel de Administración</h1>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/'}
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Volver al Inicio
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-gray-200 rounded-lg p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all flex-1 justify-center ${
                  activeTab === tab.id
                    ? 'bg-white shadow-sm text-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Contenido de Empleados */}
        {activeTab === 'empleados' && (
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Gestión de Empleados</CardTitle>
                <Button
                  onClick={() => {
                    resetForm();
                    setDialogOpen(true);
                  }}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Nuevo Empleado
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p>Cargando empleados...</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Horario</TableHead>
                        <TableHead>Estado Hoy</TableHead>
                        <TableHead>Entrada</TableHead>
                        <TableHead>Salida</TableHead>
                        <TableHead>Horas</TableHead>
                        <TableHead>Cumplim. (10d)</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {empleados.map((empleado) => {
                        const cumplimiento = cumplimientos[empleado.id];
                        const estado = estadoDiario[empleado.id];

                        return (
                          <TableRow key={empleado.id}>
                            <TableCell className="font-medium">
                              {empleado.apellido}, {empleado.nombre}
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {empleado.horario_normal}
                            </TableCell>
                            <TableCell>
                              {estado && (
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  estado.estado_puntualidad === 'a_tiempo'
                                    ? 'bg-green-100 text-green-800'
                                    : estado.estado_puntualidad === 'tarde'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : estado.estado_puntualidad === 'presente'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {estado.estado_puntualidad === 'a_tiempo' ? '✓ A tiempo' :
                                   estado.estado_puntualidad === 'tarde' ? '⏰ Tarde' :
                                   estado.estado_puntualidad === 'presente' ? '✓ Presente' :
                                   '✗ Ausente'}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              {estado?.hora_entrada || '-'}
                            </TableCell>
                            <TableCell className="text-sm">
                              {estado?.hora_salida || '-'}
                            </TableCell>
                            <TableCell className="text-sm font-medium">
                              {estado?.horas_trabajadas > 0 ? `${estado.horas_trabajadas}h` : '-'}
                            </TableCell>
                            <TableCell>
                              {cumplimiento ? (
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`w-3 h-3 rounded-full ${
                                      cumplimiento.estado === 'excelente'
                                        ? 'bg-green-500'
                                        : cumplimiento.estado === 'bueno'
                                        ? 'bg-yellow-500'
                                        : 'bg-red-500'
                                    }`}
                                    title={`${cumplimiento.porcentaje}% de cumplimiento (${cumplimiento.dias_cumplidos}/${cumplimiento.dias_trabajados} días)`}
                                  />
                                  <span className="text-sm text-gray-600">
                                    {cumplimiento.porcentaje}%
                                  </span>
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditEmpleado(empleado)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteEmpleado(empleado.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Contenido de Fichadas */}
        {activeTab === 'fichadas' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Fichadas Recientes</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Fecha y Hora</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fichadas.slice(0, 20).map((fichada) => (
                      <TableRow key={fichada.id}>
                        <TableCell>
                          {fichada.nombre} {fichada.apellido}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            fichada.tipo === 'ingreso'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {fichada.tipo}
                          </span>
                        </TableCell>
                        <TableCell>{formatDateTime(fichada.fecha_hora)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Contenido de Reportes */}
        {activeTab === 'reportes' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Reporte Diario</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Fecha</label>
                    <Input
                      type="date"
                      value={fechaFiltro}
                      onChange={(e) => setFechaFiltro(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={() => handleGenerarReporte('diario')}
                    className="w-full"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Generar Reporte Diario
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Reporte Semanal</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => handleGenerarReporte('semanal')}
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Generar Reporte Semanal
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Reporte Personalizado */}
            <Card>
              <CardHeader>
                <CardTitle>Reporte Personalizado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Empleado</label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={empleadoSeleccionado}
                    onChange={(e) => setEmpleadoSeleccionado(e.target.value)}
                  >
                    <option value="">Todos los empleados</option>
                    {empleados.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.apellido}, {emp.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Fecha Inicio</label>
                    <Input
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Fecha Fin</label>
                    <Input
                      type="date"
                      value={fechaFin}
                      onChange={(e) => setFechaFin(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleGenerarReportePersonalizado}
                    className="flex-1"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Generar Reporte
                  </Button>
                  <Button
                    onClick={handleDescargarExcel}
                    variant="outline"
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Descargar Excel
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Mostrar Datos del Reporte */}
            {reporteData && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    Resultados del Reporte - {formatDate(reporteData.fecha || reporteData.fecha_inicio)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Empleado</TableHead>
                        <TableHead>Horario Normal</TableHead>
                        <TableHead>Fichadas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reporteData.empleados?.map((emp) => (
                        <TableRow key={emp.id}>
                          <TableCell>{emp.apellido}, {emp.nombre}</TableCell>
                          <TableCell>{emp.horario_normal}</TableCell>
                          <TableCell>{emp.fichadas || 'Sin fichadas'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Mostrar Datos del Reporte Personalizado */}
            {reportePersonalizado && (
              <>
                {/* Reporte de UN empleado */}
                {reportePersonalizado.empleado && (
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        Reporte de {reportePersonalizado.empleado.apellido}, {reportePersonalizado.empleado.nombre}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Resumen */}
                      <div className="grid md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm text-gray-600">Total Horas</p>
                          <p className="text-2xl font-bold">{reportePersonalizado.resumen.total_horas}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Días Trabajados</p>
                          <p className="text-2xl font-bold">{reportePersonalizado.resumen.dias_trabajados}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Promedio Diario</p>
                          <p className="text-2xl font-bold">{reportePersonalizado.resumen.promedio_diario}h</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Diferencia Total</p>
                          <p className={`text-2xl font-bold ${parseFloat(reportePersonalizado.resumen.diferencia_total) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {reportePersonalizado.resumen.diferencia_total}h
                          </p>
                        </div>
                      </div>

                      {/* Detalles por día */}
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Entrada</TableHead>
                            <TableHead>Salida</TableHead>
                            <TableHead>Horas Trabajadas</TableHead>
                            <TableHead>Horas Esperadas</TableHead>
                            <TableHead>Diferencia</TableHead>
                            <TableHead>Estado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportePersonalizado.detalles.map((dia, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">{dia.fecha}</TableCell>
                              <TableCell>{dia.hora_entrada}</TableCell>
                              <TableCell>{dia.hora_salida}</TableCell>
                              <TableCell>{dia.horas_trabajadas}h</TableCell>
                              <TableCell>{dia.horas_esperadas}h</TableCell>
                              <TableCell className={dia.diferencia >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {dia.diferencia.toFixed(2)}h
                              </TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  dia.cumplimiento
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {dia.cumplimiento ? 'Cumplió' : 'No cumplió'}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {/* Reporte de TODOS los empleados */}
                {reportePersonalizado.empleados && (
                  <div className="space-y-6">
                    {reportePersonalizado.empleados.map((emp, empIdx) => (
                      <Card key={empIdx}>
                        <CardHeader>
                          <CardTitle>
                            {emp.empleado.apellido}, {emp.empleado.nombre}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Resumen del empleado */}
                          <div className="grid md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                            <div>
                              <p className="text-sm text-gray-600">Total Horas</p>
                              <p className="text-xl font-bold">{emp.resumen.total_horas}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Días Trabajados</p>
                              <p className="text-xl font-bold">{emp.resumen.dias_trabajados}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Promedio</p>
                              <p className="text-xl font-bold">{emp.resumen.promedio_diario}h</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Diferencia</p>
                              <p className={`text-xl font-bold ${parseFloat(emp.resumen.diferencia_total) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {emp.resumen.diferencia_total}h
                              </p>
                            </div>
                          </div>

                          {/* Detalles por día */}
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Entrada</TableHead>
                                <TableHead>Salida</TableHead>
                                <TableHead>Horas</TableHead>
                                <TableHead>Estado</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {emp.detalles.map((dia, diaIdx) => (
                                <TableRow key={diaIdx}>
                                  <TableCell className="font-medium">{dia.fecha}</TableCell>
                                  <TableCell>{dia.hora_entrada}</TableCell>
                                  <TableCell>{dia.hora_salida}</TableCell>
                                  <TableCell>{dia.horas_trabajadas}h</TableCell>
                                  <TableCell>
                                    <span className={`px-2 py-1 rounded-full text-xs ${
                                      dia.cumplimiento
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}>
                                      {dia.cumplimiento ? 'Cumplió' : 'No cumplió'}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Contenido de Ayuda */}
        {activeTab === 'ayuda' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>📖 Guía de Uso del Sistema de Fichadas</CardTitle>
              </CardHeader>
              <CardContent className="prose max-w-none">
                <div className="space-y-6">
                  {/* Sección 1: Introducción */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">🎯 Introducción</h3>
                    <p className="text-gray-700">
                      Este sistema permite registrar las entradas y salidas de empleados, calcular horas trabajadas automáticamente,
                      y generar reportes detallados para facilitar la gestión de horarios.
                    </p>
                  </div>

                  {/* Sección 2: Fichadas */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="text-lg font-bold text-blue-900 mb-2">⏰ Sistema de Fichadas</h3>
                    <ul className="list-disc pl-5 space-y-2 text-gray-700">
                      <li><strong>Detección Automática:</strong> El sistema detecta si el empleado debe registrar entrada o salida</li>
                      <li><strong>Múltiples Fichadas:</strong> Si un empleado ficha varias veces en el día, se toma el <strong>primer ingreso</strong> y la <strong>última salida</strong></li>
                      <li><strong>Ejemplo:</strong> Ingreso 8:00, Salida 12:00, Ingreso 13:00, Salida 18:00 → Total: <strong>10 horas</strong> (8:00 a 18:00)</li>
                      <li><strong>Zona Horaria:</strong> Todos los registros usan horario de Argentina (UTC-3)</li>
                    </ul>
                  </div>

                  {/* Sección 3: Gestión de Empleados */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">👥 Gestión de Empleados</h3>
                    <div className="space-y-2 text-gray-700">
                      <p><strong>Crear Empleado:</strong></p>
                      <ol className="list-decimal pl-5 space-y-1">
                        <li>Click en "Nuevo Empleado"</li>
                        <li>Completar: Nombre, Apellido, Horario Normal</li>
                        <li>Definir Horas Esperadas (diarias y semanales)</li>
                        <li>Ejemplo: 8 horas diarias, 40 semanales para jornada completa</li>
                      </ol>
                    </div>
                  </div>

                  {/* Sección 4: Indicadores de Estado */}
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="text-lg font-bold text-green-900 mb-2">📊 Indicadores en Pantalla Principal</h3>
                    <div className="space-y-2">
                      <p className="font-medium text-gray-900">Estado Hoy:</p>
                      <ul className="list-none space-y-1 text-gray-700">
                        <li>✓ <span className="text-green-600 font-medium">A tiempo:</span> Llegó dentro de los 10 minutos de tolerancia</li>
                        <li>⏰ <span className="text-yellow-600 font-medium">Tarde:</span> Llegó más de 10 minutos tarde</li>
                        <li>✓ <span className="text-blue-600 font-medium">Presente:</span> Fichó entrada (sin horario definido)</li>
                        <li>✗ <span className="text-gray-600 font-medium">Ausente:</span> No fichó entrada hoy</li>
                      </ul>
                      <p className="font-medium text-gray-900 mt-3">Cumplimiento (10 días):</p>
                      <ul className="list-none space-y-1 text-gray-700">
                        <li>🟢 <strong>Verde (≥90%):</strong> Excelente cumplimiento</li>
                        <li>🟡 <strong>Amarillo (70-89%):</strong> Buen cumplimiento</li>
                        <li>🔴 <strong>Rojo (&lt;70%):</strong> Bajo cumplimiento</li>
                      </ul>
                    </div>
                  </div>

                  {/* Sección 5: Reportes */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">📈 Reportes Disponibles</h3>
                    <div className="space-y-3 text-gray-700">
                      <div>
                        <p className="font-medium">1. Reporte Diario:</p>
                        <p className="ml-4">Muestra fichadas de todos los empleados para una fecha específica</p>
                      </div>
                      <div>
                        <p className="font-medium">2. Reporte Semanal:</p>
                        <p className="ml-4">Resume actividad de la semana actual por empleado</p>
                      </div>
                      <div>
                        <p className="font-medium">3. Reporte Personalizado:</p>
                        <ul className="list-disc pl-9 mt-1">
                          <li>Seleccionar empleado específico o "Todos los empleados"</li>
                          <li>Definir rango de fechas personalizado</li>
                          <li>Ver detalles diarios con horas trabajadas vs esperadas</li>
                          <li>Indicadores de cumplimiento por día</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium">4. Exportación a Excel:</p>
                        <ul className="list-disc pl-9 mt-1">
                          <li>Click en "Descargar Excel" desde Reportes Personalizados</li>
                          <li>Un empleado: Una hoja con todos los detalles</li>
                          <li>Todos los empleados: Una hoja por empleado</li>
                          <li>Incluye formato con colores y resumen automático</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Sección 6: Cálculo de Horas */}
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="text-lg font-bold text-purple-900 mb-2">🧮 Cómo se Calculan las Horas</h3>
                    <div className="space-y-2 text-gray-700">
                      <p><strong>Horas Trabajadas:</strong> Diferencia entre primer ingreso y última salida del día</p>
                      <p><strong>Diferencia:</strong> Horas Trabajadas - Horas Esperadas</p>
                      <p><strong>Ejemplos:</strong></p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Entrada 8:00, Salida 17:00, Esperadas 8h → Trabajadas: <strong>9h</strong>, Diferencia: <strong>+1h</strong></li>
                        <li>Entrada 9:00, Salida 17:00, Esperadas 8h → Trabajadas: <strong>8h</strong>, Diferencia: <strong>0h</strong></li>
                        <li>Entrada 9:00, Salida 16:30, Esperadas 8h → Trabajadas: <strong>7.5h</strong>, Diferencia: <strong>-0.5h</strong></li>
                      </ul>
                      <p className="text-sm italic mt-2">Nota: Si no hay salida registrada, se muestra "Sin registro" y 0 horas trabajadas</p>
                    </div>
                  </div>

                  {/* Sección 7: Consejos */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">💡 Consejos y Buenas Prácticas</h3>
                    <ul className="list-disc pl-5 space-y-1 text-gray-700">
                      <li>Asegúrate de fichar tanto entrada como salida cada día</li>
                      <li>Los reportes se actualizan automáticamente al generar</li>
                      <li>El indicador de cumplimiento se basa en los últimos 10 días trabajados</li>
                      <li>Revisa el estado diario en la pantalla principal del admin</li>
                      <li>Usa reportes personalizados para análisis detallados de períodos específicos</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Dialog para Empleado */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingEmpleado ? 'Editar Empleado' : 'Nuevo Empleado'}
            </DialogTitle>
            <DialogDescription>
              Complete los datos del empleado
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitEmpleado} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nombre</label>
              <Input
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Apellido</label>
              <Input
                value={formData.apellido}
                onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Horario Normal</label>
              <Input
                value={formData.horario_normal}
                onChange={(e) => setFormData({ ...formData, horario_normal: e.target.value })}
                placeholder="Ej: Lunes a Viernes 8:00-17:00"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Horas Diarias Esperadas</label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  value={formData.horas_esperadas_diarias}
                  onChange={(e) => setFormData({ ...formData, horas_esperadas_diarias: parseFloat(e.target.value) })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Horas Semanales Esperadas</label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  max="168"
                  value={formData.horas_esperadas_semanales}
                  onChange={(e) => setFormData({ ...formData, horas_esperadas_semanales: parseFloat(e.target.value) })}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {editingEmpleado ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PanelAdmin;