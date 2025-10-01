import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useEmpleados, useFichadas, useVersiculos } from '@/hooks/useApi';
import { formatTime } from '@/lib/utils';
import { Clock, User, AlertCircle, Settings } from 'lucide-react';

const FichadoPrincipal = () => {
  const { empleados, loading: loadingEmpleados } = useEmpleados();
  const { registrarFichada, verificarEstado } = useFichadas();
  const { versiculo } = useVersiculos();

  const [selectedEmpleado, setSelectedEmpleado] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tipoFichada, setTipoFichada] = useState('');
  const [processing, setProcessing] = useState(false);
  const [notification, setNotification] = useState('');
  const [estadosEmpleados, setEstadosEmpleados] = useState({});

  // Cargar estado de cada empleado al iniciar
  useEffect(() => {
    const cargarEstados = async () => {
      if (empleados.length > 0) {
        const estados = {};
        for (const emp of empleados) {
          try {
            const estado = await verificarEstado(emp.id);
            estados[emp.id] = estado;
          } catch (error) {
            console.error(`Error cargando estado de ${emp.nombre}:`, error);
          }
        }
        setEstadosEmpleados(estados);
      }
    };
    cargarEstados();
  }, [empleados]);

  const handleEmpleadoClick = async (empleado) => {
    try {
      setProcessing(true);
      const estado = await verificarEstado(empleado.id);
      setSelectedEmpleado(empleado);
      setTipoFichada(estado.proximo_tipo);
      setDialogOpen(true);
    } catch (error) {
      showNotification(`Error: ${error.message}`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const confirmarFichada = async () => {
    try {
      setProcessing(true);
      const result = await registrarFichada(selectedEmpleado.id);
      setDialogOpen(false);
      showNotification(result.message, 'success');

      // Actualizar estado del empleado
      const nuevoEstado = await verificarEstado(selectedEmpleado.id);
      setEstadosEmpleados(prev => ({ ...prev, [selectedEmpleado.id]: nuevoEstado }));
    } catch (error) {
      showNotification(`Error: ${error.message}`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(''), 5000);
  };

  if (loadingEmpleados) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-white text-xl">Cargando empleados...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg relative overflow-hidden">
      {/* Notificación */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white`}>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {notification.message}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="container mx-auto p-6">
        <div className="text-center mb-8">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-3 drop-shadow-2xl tracking-tight">
            Control de Asistencia
          </h1>
          <p className="text-xl md:text-2xl text-white/80 mb-4 font-light">
            Tu tiempo cuenta, tu presencia importa
          </p>
          <div className="flex items-center justify-center gap-2 text-white/90 text-lg backdrop-blur-sm bg-white/10 rounded-full px-6 py-2 inline-flex">
            <Clock className="h-5 w-5" />
            {new Date().toLocaleString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>

        {/* Versículo */}
        {versiculo && (
          <Card className="mb-8 bg-gradient-to-r from-white/15 to-white/5 backdrop-blur-md border-white/30 text-white shadow-2xl">
            <CardContent className="p-8 text-center">
              <div className="mb-3 text-white/60 text-sm uppercase tracking-widest font-semibold">
                Versículo del Día
              </div>
              <p className="text-2xl md:text-3xl italic mb-4 leading-relaxed font-light">
                "{versiculo.text}"
              </p>
              <p className="text-lg text-white/90 font-semibold">{versiculo.reference}</p>
            </CardContent>
          </Card>
        )}

        {/* Lista de Empleados */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {empleados.map((empleado) => {
            const estado = estadosEmpleados[empleado.id];
            const yaFicho = estado?.ultima_fichada && estado.ultima_fichada.tipo === 'ingreso';

            return (
              <Card
                key={empleado.id}
                className="bg-white/95 backdrop-blur-sm hover:bg-white hover:scale-105 transition-all duration-200 cursor-pointer touch-manipulation shadow-lg relative overflow-hidden"
                onClick={() => handleEmpleadoClick(empleado)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleEmpleadoClick(empleado);
                  }
                }}
                aria-label={`Fichar para ${empleado.nombre} ${empleado.apellido}`}
              >
                {/* Indicador de estado */}
                {yaFicho && (
                  <div className="absolute top-3 right-3 z-10">
                    <div className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      Presente
                    </div>
                  </div>
                )}

                <CardHeader className="text-center pb-4">
                  <div className={`mx-auto w-16 h-16 bg-gradient-to-br ${yaFicho ? 'from-green-500 to-emerald-600' : 'from-blue-500 to-purple-600'} rounded-full flex items-center justify-center mb-4 shadow-lg`}>
                    <User className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-xl font-bold text-gray-800">
                    {empleado.nombre} {empleado.apellido}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center pt-0">
                  <p className="text-sm text-gray-600 mb-2">{empleado.horario_normal}</p>
                  {estado?.ultima_fichada && (
                    <p className="text-xs text-gray-500 mb-3">
                      {estado.ultima_fichada.tipo === 'ingreso' ? '✓ Entrada registrada' : 'Salida registrada'}
                    </p>
                  )}
                  <Button
                    className={`w-full text-lg py-6 ${yaFicho ? 'bg-red-500 hover:bg-red-600' : ''}`}
                    disabled={processing}
                  >
                    {processing ? 'Procesando...' : yaFicho ? 'Registrar Salida' : 'Registrar Entrada'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {empleados.length === 0 && (
          <Card className="bg-white/90 backdrop-blur-sm text-center py-12">
            <CardContent>
              <p className="text-xl text-gray-600">
                No hay empleados registrados.
                <br />
                Contacte al administrador para agregar empleados.
              </p>
            </CardContent>
          </Card>
        )}

      </div>

      {/* Botón Admin flotante */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="lg"
          className="rounded-full w-14 h-14 shadow-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md border-2 border-white/40 text-white hover:scale-110 transition-all duration-200"
          onClick={() => window.location.href = '/admin'}
          title="Panel de Administración"
        >
          <Settings className="h-6 w-6" />
        </Button>
      </div>

      {/* Dialog de Confirmación */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Confirmar Fichada</DialogTitle>
            <DialogDescription className="text-base mt-4">
              Usted está registrando el <strong className="text-blue-600">{tipoFichada}</strong> de{' '}
              <strong className="text-gray-800">
                {selectedEmpleado?.nombre} {selectedEmpleado?.apellido}
              </strong>{' '}
              a las <strong className="text-green-600">{formatTime(new Date())}</strong>.
              <br /><br />
              Si la información es correcta, haga clic en aceptar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={processing}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmarFichada}
              disabled={processing}
              className="flex-1"
            >
              {processing ? 'Registrando...' : 'Aceptar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FichadoPrincipal;