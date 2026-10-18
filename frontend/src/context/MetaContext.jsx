import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from './AuthContext.jsx';

const MetaContext = createContext({ categories: [], departments: [], staff: [], slaHours: {}, reload: () => {} });

/** Lookup data (categories, departments, staff) shared by forms and filters. */
export function MetaProvider({ children }) {
  const { user } = useAuth();
  const [meta, setMeta] = useState({ categories: [], departments: [], staff: [], slaHours: {} });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!user) return;
    api
      .get('/meta')
      .then((res) => setMeta(res.data))
      .catch(() => {});
  }, [user, version]);

  return <MetaContext.Provider value={{ ...meta, reload: () => setVersion((v) => v + 1) }}>{children}</MetaContext.Provider>;
}

export const useMeta = () => useContext(MetaContext);
