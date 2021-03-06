import React, {
  createContext,
  useCallback,
  useState,
  useContext,
  useEffect,
} from 'react';

import AsyncStorage from '@react-native-community/async-storage';
import { useMutation } from 'relay-hooks';

import SignInMutation from '../data/relay/SignInMutation';

interface User {
  id: string;
}

interface AuthState {
  token: string;
  user: User;
}

interface SignInCredentials {
  email: string;
  password: string;
}

interface AuthContextData {
  user: User;
  loading: boolean;
  signIn(credentials: SignInCredentials): Promise<void>;
  signOut(): void;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

const AuthProvider: React.FC = ({ children }) => {
  const [data, setData] = useState<AuthState>({} as AuthState);
  const [loading, setLoading] = useState(true);
  const [commit] = useMutation(SignInMutation);

  const handleSignIn = useCallback(
    (email: string, password: string) => {
      const config = {
        variables: {
          email: email,
          password: password,
        },
      };

      return commit(config) as Promise<{ signIn: AuthState }>;
    },
    [commit],
  );

  useEffect(() => {
    async function loadStorageData(): Promise<void> {
      const [token, user] = await AsyncStorage.multiGet(['token', 'user']);

      if (token[1] && user[1]) {
        setData({ token: token[1], user: JSON.parse(user[1]) });
      }

      setLoading(false);
    }

    loadStorageData();
  }, []);

  const signIn = useCallback(
    async ({ email, password }) => {
      const response = await handleSignIn(email, password);

      const { token, user } = response.signIn;

      await AsyncStorage.multiSet([
        ['token', token],
        ['user', JSON.stringify(user)],
      ]);

      setData({ token, user });
    },
    [handleSignIn],
  );

  const signOut = useCallback(async () => {
    await AsyncStorage.multiRemove(['token', 'user']);

    setData({} as AuthState);
  }, []);

  return (
    <AuthContext.Provider value={{ user: data.user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

function useAuth(): AuthContextData {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { AuthProvider, useAuth };
