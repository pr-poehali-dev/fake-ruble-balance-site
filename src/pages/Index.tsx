import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

const API_AUTH = 'https://functions.poehali.dev/6ad1fc37-5cb5-4c61-9c5b-112b27f741f2';
const API_TRANSACTIONS = 'https://functions.poehali.dev/68d7f1c1-cfb2-4bc5-916f-806f132dc1d7';
const API_BALANCE = 'https://functions.poehali.dev/87139c1e-e3ba-42c9-95cb-71bf65f3840b';

interface User {
  id: number;
  username: string;
  full_name: string;
  balance: number;
}

interface Transaction {
  id: number;
  amount: number;
  type: string;
  description: string;
  date: string;
  from_user: { id: number; username: string; full_name: string } | null;
  to_user: { id: number; username: string; full_name: string } | null;
}

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState('home');
  const { toast } = useToast();

  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ username: '', password: '', full_name: '' });
  const [transferForm, setTransferForm] = useState({ to_username: '', amount: '', description: '' });

  useEffect(() => {
    const savedUser = localStorage.getItem('bank_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    if (user && activeTab === 'history') {
      loadTransactions();
    }
  }, [user, activeTab]);

  const handleLogin = async () => {
    try {
      const res = await fetch(API_AUTH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', ...loginForm }),
      });
      const data = await res.json();
      
      if (data.success) {
        setUser(data.user);
        localStorage.setItem('bank_user', JSON.stringify(data.user));
        toast({ title: 'Добро пожаловать!', description: `Здравствуйте, ${data.user.full_name}` });
        setLoginForm({ username: '', password: '' });
      } else {
        toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка соединения', description: 'Не удалось подключиться к серверу', variant: 'destructive' });
    }
  };

  const handleRegister = async () => {
    try {
      const res = await fetch(API_AUTH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', ...registerForm }),
      });
      const data = await res.json();
      
      if (data.success) {
        setUser(data.user);
        localStorage.setItem('bank_user', JSON.stringify(data.user));
        toast({ title: 'Регистрация успешна!', description: 'Добро пожаловать в банк!' });
        setRegisterForm({ username: '', password: '', full_name: '' });
      } else {
        toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка соединения', description: 'Не удалось подключиться к серверу', variant: 'destructive' });
    }
  };

  const loadTransactions = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_TRANSACTIONS}?user_id=${user.id}`);
      if (!res.ok) throw new Error('Failed to fetch');
      
      const data = await res.json();
      setTransactions(data.transactions || []);
      
      const balanceRes = await fetch(`${API_BALANCE}?user_id=${user.id}`);
      if (balanceRes.ok) {
        const balanceData = await balanceRes.json();
        if (balanceData.balance !== undefined) {
          const updatedUser = { ...user, balance: balanceData.balance };
          setUser(updatedUser);
          localStorage.setItem('bank_user', JSON.stringify(updatedUser));
        }
      }
    } catch (error) {
      console.error('Failed to load transactions:', error);
      toast({ title: 'Ошибка', description: 'Не удалось загрузить историю', variant: 'destructive' });
    }
  };

  const handleTransfer = async () => {
    if (!user) return;
    
    const amount = parseFloat(transferForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Ошибка', description: 'Введите корректную сумму', variant: 'destructive' });
      return;
    }
    
    if (!transferForm.to_username.trim()) {
      toast({ title: 'Ошибка', description: 'Введите имя получателя', variant: 'destructive' });
      return;
    }
    
    try {
      const res = await fetch(API_TRANSACTIONS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_user_id: user.id,
          to_username: transferForm.to_username.trim(),
          amount: amount,
          description: transferForm.description || 'Перевод',
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        toast({ title: 'Ошибка', description: errorData.error || 'Ошибка перевода', variant: 'destructive' });
        return;
      }
      
      const data = await res.json();
      
      if (data.success) {
        const updatedUser = { ...user, balance: data.new_balance };
        setUser(updatedUser);
        localStorage.setItem('bank_user', JSON.stringify(updatedUser));
        toast({ title: 'Успешно!', description: `Переведено ${amount} ₽` });
        setTransferForm({ to_username: '', amount: '', description: '' });
        if (activeTab === 'history') {
          loadTransactions();
        }
      } else {
        toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      console.error('Transfer error:', error);
      toast({ title: 'Ошибка соединения', description: 'Не удалось выполнить перевод', variant: 'destructive' });
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('bank_user');
    setActiveTab('home');
    toast({ title: 'Вы вышли из системы' });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-blue-200">
          <CardHeader className="space-y-2 text-center pb-8">
            <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
              <Icon name="Building2" className="text-white" size={32} />
            </div>
            <CardTitle className="text-3xl font-bold text-blue-900">Рублёвый Банк</CardTitle>
            <CardDescription className="text-base">Ваши виртуальные рубли в безопасности</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Вход</TabsTrigger>
                <TabsTrigger value="register">Регистрация</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-username">Имя пользователя</Label>
                  <Input
                    id="login-username"
                    value={loginForm.username}
                    onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                    placeholder="ivan_petrov"
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Пароль</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    placeholder="••••••"
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  />
                </div>
                <Button onClick={handleLogin} className="w-full mt-6 h-11" size="lg">
                  <Icon name="LogIn" size={18} className="mr-2" />
                  Войти
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-4">
                  Тестовый аккаунт: demo / demo123
                </p>
              </TabsContent>

              <TabsContent value="register" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-fullname">Полное имя</Label>
                  <Input
                    id="reg-fullname"
                    value={registerForm.full_name}
                    onChange={(e) => setRegisterForm({ ...registerForm, full_name: e.target.value })}
                    placeholder="Иван Петров"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-username">Имя пользователя</Label>
                  <Input
                    id="reg-username"
                    value={registerForm.username}
                    onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                    placeholder="ivan_petrov"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Пароль</Label>
                  <Input
                    id="reg-password"
                    type="password"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                    placeholder="••••••"
                  />
                </div>
                <Button onClick={handleRegister} className="w-full mt-6 h-11" size="lg">
                  <Icon name="UserPlus" size={18} className="mr-2" />
                  Зарегистрироваться
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-6 border-blue-200 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl mb-1">{user.full_name}</CardTitle>
                <CardDescription className="text-blue-100">@{user.username}</CardDescription>
              </div>
              <Button onClick={handleLogout} variant="secondary" size="sm">
                <Icon name="LogOut" size={16} className="mr-2" />
                Выйти
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Баланс</p>
              <p className="text-5xl font-bold text-blue-900">{user.balance.toLocaleString('ru-RU')} ₽</p>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="home">Перевод</TabsTrigger>
            <TabsTrigger value="history">История</TabsTrigger>
          </TabsList>

          <TabsContent value="home">
            <Card className="border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="Send" size={24} />
                  Перевод средств
                </CardTitle>
                <CardDescription>Переведите деньги другому пользователю</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="to_username">Имя получателя</Label>
                  <Input
                    id="to_username"
                    value={transferForm.to_username}
                    onChange={(e) => setTransferForm({ ...transferForm, to_username: e.target.value })}
                    placeholder="username123"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Сумма (₽)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={transferForm.amount}
                    onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                    placeholder="1000"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Комментарий (необязательно)</Label>
                  <Input
                    id="description"
                    value={transferForm.description}
                    onChange={(e) => setTransferForm({ ...transferForm, description: e.target.value })}
                    placeholder="За обед"
                  />
                </div>
                <Button onClick={handleTransfer} className="w-full h-12" size="lg">
                  <Icon name="ArrowRight" size={20} className="mr-2" />
                  Отправить перевод
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="History" size={24} />
                  История операций
                </CardTitle>
                <CardDescription>Последние {transactions.length} транзакций</CardDescription>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Нет операций</p>
                ) : (
                  <div className="space-y-3">
                    {transactions.map((t) => {
                      const isIncoming = t.to_user?.id === user.id;
                      const otherUser = isIncoming ? t.from_user : t.to_user;
                      
                      return (
                        <div key={t.id} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isIncoming ? 'bg-green-100' : 'bg-red-100'}`}>
                              <Icon 
                                name={isIncoming ? 'ArrowDown' : 'ArrowUp'} 
                                size={20} 
                                className={isIncoming ? 'text-green-600' : 'text-red-600'} 
                              />
                            </div>
                            <div>
                              <p className="font-medium">
                                {isIncoming ? 'От' : 'К'}: {otherUser?.full_name || 'Неизвестно'}
                              </p>
                              <p className="text-sm text-muted-foreground">@{otherUser?.username || 'unknown'}</p>
                              {t.description && (
                                <p className="text-xs text-muted-foreground italic">{t.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-bold ${isIncoming ? 'text-green-600' : 'text-red-600'}`}>
                              {isIncoming ? '+' : '-'}{t.amount.toLocaleString('ru-RU')} ₽
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(t.date).toLocaleDateString('ru-RU', { 
                                day: '2-digit', 
                                month: '2-digit', 
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
