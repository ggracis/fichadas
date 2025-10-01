import { useState } from 'react';
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
import { Clock, User, AlertCircle } from 'lucide-react';

const FichadoPrincipal = () => {
  const { empleados, loading: loadingEmpleados } = useEmpleados();
  const { registrarFichada, verificarEstado } = useFichadas();
  const { versiculo } = useVersiculos();

  const [selectedEmpleado, setSelectedEmpleado] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tipoFichada, setTipoFichada] = useState('');
  const [processing, setProcessing] = useState(false);
  const [notification, setNotification] = useState('');

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
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 drop-shadow-lg">
            Sistema de Fichadas
          </h1>
          <div className="flex items-center justify-center gap-2 text-white/90 text-lg">
            <Clock className="h-6 w-6" />
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
          <Card className="mb-8 bg-white/10 backdrop-blur-sm border-white/20 text-white">
            <CardContent className="p-6 text-center">
              <p className="text-2xl italic mb-3">"{versiculo.text}"</p>
              <p className="text-base text-white/90 font-medium">{versiculo.reference}</p>
            </CardContent>
          </Card>
        )}

        {/* Lista de Empleados */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {empleados.map((empleado) => (
            <Card
              key={empleado.id}
              className="bg-white/90 backdrop-blur-sm hover:bg-white hover:scale-105 transition-all duration-200 cursor-pointer touch-manipulation"
              onClick={() => handleEmpleadoClick(empleado)}
            >
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
                  <User className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl font-bold text-gray-800">
                  {empleado.nombre} {empleado.apellido}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center pt-0">
                <p className="text-sm text-gray-600 mb-4">{empleado.horario_normal}</p>
                <Button
                  className="w-full text-lg py-6"
                  disabled={processing}
                >
                  {processing ? 'Procesando...' : 'Fichar'}
                </Button>
              </CardContent>
            </Card>
          ))}
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

        {/* Enlace al Admin */}
        <div className="text-center mt-8">
          <Button
            variant="outline"
            className="bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30"
            onClick={() => window.location.href = '/admin'}
          >
            Panel de Administración
          </Button>
        </div>
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