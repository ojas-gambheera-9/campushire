import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { CognitoUserPool, CognitoUser, AuthenticationDetails, CognitoUserAttribute } from 'amazon-cognito-identity-js';

const pool = new CognitoUserPool({
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || 'ap-south-1_placeholder',
  ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || 'placeholder',
});

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

const claimsOf = (session) => {
  const p = session.getIdToken().decodePayload();
  return { email: p.email, name: p.name || '', role: p['custom:role'], token: session.getIdToken().getJwtToken() };
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const cu = pool.getCurrentUser();
    if (!cu) return setReady(true);
    cu.getSession((err, session) => {
      if (!err && session?.isValid()) setUser(claimsOf(session));
      setReady(true);
    });
  }, []);

  const signUp = (email, password, name, role, company) =>
    new Promise((resolve, reject) => {
      const attrs = [
        new CognitoUserAttribute({ Name: 'email', Value: email }),
        new CognitoUserAttribute({ Name: 'name', Value: name }),
        new CognitoUserAttribute({ Name: 'custom:role', Value: role }),
      ];
      if (company) attrs.push(new CognitoUserAttribute({ Name: 'custom:company', Value: company }));
      pool.signUp(email, password, attrs, null, (err, res) => (err ? reject(err) : resolve(res)));
    });

  const confirm = (email, code) =>
    new Promise((resolve, reject) =>
      new CognitoUser({ Username: email, Pool: pool }).confirmRegistration(code, true, (err, r) => (err ? reject(err) : resolve(r)))
    );

  const signIn = (email, password) =>
    new Promise((resolve, reject) => {
      const cu = new CognitoUser({ Username: email, Pool: pool });
      cu.authenticateUser(new AuthenticationDetails({ Username: email, Password: password }), {
        onSuccess: (session) => { const u = claimsOf(session); setUser(u); resolve(u); },
        onFailure: reject,
      });
    });

  const signOut = () => { pool.getCurrentUser()?.signOut(); setUser(null); };

  // Always returns a fresh (auto-refreshed) ID token for API calls.
  const getToken = useCallback(
    () =>
      new Promise((resolve, reject) => {
        const cu = pool.getCurrentUser();
        if (!cu) return reject(new Error('Not signed in'));
        cu.getSession((err, s) => (err || !s?.isValid() ? reject(err || new Error('Session expired')) : resolve(s.getIdToken().getJwtToken())));
      }),
    []
  );

  return <AuthCtx.Provider value={{ user, ready, signUp, confirm, signIn, signOut, getToken }}>{children}</AuthCtx.Provider>;
}
