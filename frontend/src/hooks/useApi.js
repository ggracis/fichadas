import { useState, useEffect } from 'react';
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

export const useEmpleados = () => {
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cumplimientos, setCumplimientos] = useState({});
  const [estadoDiario, setEstadoDiario] = useState({});

  const fetchEmpleados = async () => {
    try {
      setLoading(true);
      const response = await api.get('/empleados');
      setEmpleados(response.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCumplimientos = async () => {
    try {
      const response = await api.get('/empleados/cumplimiento');
      const cumplimientosMap = {};
      response.data.forEach(c => {
        cumplimientosMap[c.empleado_id] = c;
      });
      setCumplimientos(cumplimientosMap);
    } catch (err) {
      console.error('Error fetching cumplimientos:', err);
    }
  };

  const fetchEstadoDiario = async () => {
    try {
      const response = await api.get('/empleados/estado-diario');
      const estadoMap = {};
      response.data.forEach(e => {
        estadoMap[e.empleado_id] = e;
      });
      setEstadoDiario(estadoMap);
    } catch (err) {
      console.error('Error fetching estado diario:', err);
    }
  };

  const createEmpleado = async (empleado) => {
    try {
      const response = await api.post('/empleados', empleado);
      await fetchEmpleados();
      return response.data;
    } catch (err) {
      throw new Error(err.response?.data?.error || err.message);
    }
  };

  const updateEmpleado = async (id, empleado) => {
    try {
      const response = await api.put(`/empleados/${id}`, empleado);
      await fetchEmpleados();
      return response.data;
    } catch (err) {
      throw new Error(err.response?.data?.error || err.message);
    }
  };

  const deleteEmpleado = async (id) => {
    try {
      const response = await api.delete(`/empleados/${id}`);
      await fetchEmpleados();
      return response.data;
    } catch (err) {
      throw new Error(err.response?.data?.error || err.message);
    }
  };

  useEffect(() => {
    fetchEmpleados();
    fetchCumplimientos();
    fetchEstadoDiario();
  }, []);

  return {
    empleados,
    loading,
    error,
    cumplimientos,
    estadoDiario,
    fetchEmpleados,
    fetchCumplimientos,
    fetchEstadoDiario,
    createEmpleado,
    updateEmpleado,
    deleteEmpleado
  };
};

export const useFichadas = () => {
  const [fichadas, setFichadas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchFichadas = async (params = {}) => {
    try {
      setLoading(true);
      const response = await api.get('/fichadas', { params });
      setFichadas(response.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const registrarFichada = async (empleadoId, observaciones = '') => {
    try {
      const response = await api.post('/fichadas', {
        empleado_id: empleadoId,
        observaciones
      });
      return response.data;
    } catch (err) {
      throw new Error(err.response?.data?.error || err.message);
    }
  };

  const verificarEstado = async (empleadoId) => {
    try {
      const response = await api.get(`/fichadas/estado/${empleadoId}`);
      return response.data;
    } catch (err) {
      throw new Error(err.response?.data?.error || err.message);
    }
  };

  return {
    fichadas,
    loading,
    error,
    fetchFichadas,
    registrarFichada,
    verificarEstado
  };
};

export const useReportes = () => {
  const [reportes, setReportes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchReporteDiario = async (fecha) => {
    try {
      setLoading(true);
      const response = await api.get('/reportes/diario', {
        params: fecha ? { fecha } : {}
      });
      setReportes(response.data);
      setError(null);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw new Error(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchReporteSemanal = async (fechaInicio, fechaFin) => {
    try {
      setLoading(true);
      const params = {};
      if (fechaInicio) params.fecha_inicio = fechaInicio;
      if (fechaFin) params.fecha_fin = fechaFin;

      const response = await api.get('/reportes/semanal', { params });
      setReportes(response.data);
      setError(null);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw new Error(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    reportes,
    loading,
    error,
    fetchReporteDiario,
    fetchReporteSemanal
  };
};

export const useVersiculos = () => {
  const [versiculo, setVersiculo] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchVersiculo = async () => {
    try {
      setLoading(true);
      // Lista de versículos aleatorios comunes (formato: libro/capitulo/versiculo)
      const versiculos = [
        { path: 'juan/3/16', ref: 'Juan 3:16' },
        { path: 'romanos/8/28', ref: 'Romanos 8:28' },
        { path: 'filipenses/4/13', ref: 'Filipenses 4:13' },
        { path: 'salmos/23/1-6', ref: 'Salmos 23:1-6' },
        { path: 'proverbios/3/5-6', ref: 'Proverbios 3:5-6' },
        { path: 'isaias/40/31', ref: 'Isaías 40:31' },
        { path: 'mateo/11/28-30', ref: 'Mateo 11:28-30' },
        { path: 'jeremias/29/11', ref: 'Jeremías 29:11' },
        { path: 'corintios1/10/13', ref: '1 Corintios 10:13' },
        { path: 'salmos/46/1', ref: 'Salmos 46:1' }
      ];

      const versiculoAleatorio = versiculos[Math.floor(Math.random() * versiculos.length)];
      const response = await fetch(`https://bible-api.deno.dev/api/read/nvi/${versiculoAleatorio.path}`);

      if (response.ok) {
        const data = await response.json();
        // Validar que la respuesta tenga los campos necesarios
        if (data && data.verse) {
          setVersiculo({
            text: data.verse,
            reference: versiculoAleatorio.ref
          });
        } else {
          console.warn('Respuesta de API inválida:', data);
        }
      } else {
        const errorData = await response.json();
        console.error('Error en respuesta de API:', errorData);
      }
    } catch (err) {
      console.error('Error fetching versículo:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVersiculo();
    // Cambiar versículo cada hora
    const interval = setInterval(fetchVersiculo, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { versiculo, loading, fetchVersiculo };
};