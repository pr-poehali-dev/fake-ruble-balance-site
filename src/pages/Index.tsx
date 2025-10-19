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
    if (user) {
      loadTransactions();
    }
  }, [user]);

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
      toast({ title: 'Ошибка соединения', variant: 'destructive' });
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
      toast({ title: 'Ошибка соединения', variant: 'destructive' });
    }
  };

  const loadTransactions = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_TRANSACTIONS}?user_id=${user.id}`);
      const data = await res.json();
      setTransactions(data.transactions || []);
      
      const balanceRes = await fetch(`${API_BALANCE}?user_id=${user.id}`);
      const balanceData = await balanceRes.json();
      if (balanceData.balance !== undefined) {
        const updatedUser = { ...user, balance: balanceData.balance };
        setUser(updatedUser);
        localStorage.setItem('bank_user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error('Failed to load transactions');
    }
  };

  const handleTransfer = async () => {
    if (!user) return;
    try {
      const res = await fetch(API_TRANSACTIONS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_user_id: user.id,
          to_username: transferForm.to_username,
          amount: parseFloat(transferForm.amount),
          description: transferForm.description || 'Перевод',
        }),
      });
      const data = await res.json();
      
      if (data.success) {
        setUser({ ...user, balance: data.new_balance });
        localStorage.setItem('bank_user', JSON.stringify({ ...user, balance: data.new_balance }));
        toast({ title: 'Успешно!', description: `Переведено ${transferForm.amount} ₽` });
        setTransferForm({ to_username: '', amount: '', description: '' });
        loadTransactions();
      } else {
        toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка соединения', variant: 'destructive' });
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-slate-200">
          <CardHeader className="space-y-2 text-center pb-8">
            <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4">
              <Icon name="Building2" className="text-primary-foreground" size={32} />
            </div>
            <CardTitle className="text-3xl font-bold">Безопасный Банк</CardTitle>
            <CardDescription className="text-base">Надёжность • Защита • Удобство</CardDescription>
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
                  Создать аккаунт
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-4">
                  Стартовый баланс: 10 000 ₽
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="border-b bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <Icon name="Building2" className="text-primary-foreground" size={20} />
            </div>
            <h1 className="text-xl font-bold">Безопасный Банк</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Баланс</p>
              <p className="text-2xl font-bold text-accent">{user.balance.toLocaleString('ru-RU')} ₽</p>
            </div>
            <Button variant="outline" size="icon" onClick={handleLogout}>
              <Icon name="LogOut" size={18} />
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8 bg-white shadow-sm">
            <TabsTrigger value="home" className="gap-2">
              <Icon name="Home" size={16} />
              Главная
            </TabsTrigger>
            <TabsTrigger value="transfer" className="gap-2">
              <Icon name="Send" size={16} />
              Перевод
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <Icon name="History" size={16} />
              История
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2">
              <Icon name="User" size={16} />
              Профиль
            </TabsTrigger>
          </TabsList>

          <TabsContent value="home" className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="Wallet" size={24} />
                  Ваш баланс
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-5xl font-bold text-accent mb-2">{user.balance.toLocaleString('ru-RU')} ₽</p>
                <p className="text-muted-foreground">Виртуальная валюта</p>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-3 gap-4">
              <Card className="shadow-md hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveTab('transfer')}>
                <CardContent className="pt-6 text-center">
                  <Icon name="ArrowUpRight" size={32} className="mx-auto mb-3 text-primary" />
                  <p className="font-semibold">Отправить деньги</p>
                </CardContent>
              </Card>
              <Card className="shadow-md hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveTab('history')}>
                <CardContent className="pt-6 text-center">
                  <Icon name="Receipt" size={32} className="mx-auto mb-3 text-primary" />
                  <p className="font-semibold">Просмотр истории</p>
                </CardContent>
              </Card>
              <Card className="shadow-md hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveTab('profile')}>
                <CardContent className="pt-6 text-center">
                  <Icon name="Settings" size={32} className="mx-auto mb-3 text-primary" />
                  <p className="font-semibold">Настройки</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="transfer" className="space-y-6">
            <Card className="shadow-lg max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="Send" size={24} />
                  Перевод средств
                </CardTitle>
                <CardDescription>Отправьте деньги другому пользователю</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="to-username">Получатель (username)</Label>
                  <Input
                    id="to-username"
                    value={transferForm.to_username}
                    onChange={(e) => setTransferForm({ ...transferForm, to_username: e.target.value })}
                    placeholder="maria_ivanova"
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
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Назначение платежа</Label>
                  <Input
                    id="description"
                    value={transferForm.description}
                    onChange={(e) => setTransferForm({ ...transferForm, description: e.target.value })}
                    placeholder="За услуги"
                  />
                </div>
                <Button onClick={handleTransfer} className="w-full mt-6 h-11" size="lg">
                  <Icon name="ArrowRight" size={18} className="mr-2" />
                  Отправить перевод
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="History" size={24} />
                  История операций
                </CardTitle>
                <CardDescription>Все ваши транзакции</CardDescription>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Нет транзакций</p>
                ) : (
                  <div className="space-y-3">
                    {transactions.map((t) => {
                      const isIncoming = t.to_user?.id === user.id;
                      return (
                        <div key={t.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isIncoming ? 'bg-green-100' : 'bg-red-100'}`}>
                              <Icon name={isIncoming ? 'ArrowDownLeft' : 'ArrowUpRight'} size={20} className={isIncoming ? 'text-green-600' : 'text-red-600'} />
                            </div>
                            <div>
                              <p className="font-semibold">
                                {isIncoming ? `От ${t.from_user?.full_name}` : `Для ${t.to_user?.full_name}`}
                              </p>
                              <p className="text-sm text-muted-foreground">{t.description}</p>
                              <p className="text-xs text-muted-foreground">{new Date(t.date).toLocaleString('ru-RU')}</p>
                            </div>
                          </div>
                          <p className={`text-xl font-bold ${isIncoming ? 'text-green-600' : 'text-red-600'}`}>
                            {isIncoming ? '+' : '-'}{t.amount.toLocaleString('ru-RU')} ₽
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <Card className="shadow-lg max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="User" size={24} />
                  Профиль
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between py-3 border-b">
                    <span className="text-muted-foreground">Полное имя</span>
                    <span className="font-semibold">{user.full_name}</span>
                  </div>
                  <div className="flex justify-between py-3 border-b">
                    <span className="text-muted-foreground">Имя пользователя</span>
                    <span className="font-semibold">@{user.username}</span>
                  </div>
                  <div className="flex justify-between py-3 border-b">
                    <span className="text-muted-foreground">ID пользователя</span>
                    <span className="font-semibold">#{user.id}</span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="text-muted-foreground">Баланс</span>
                    <span className="font-semibold text-accent">{user.balance.toLocaleString('ru-RU')} ₽</span>
                  </div>
                </div>
                
                <Separator className="my-6" />
                
                <Button onClick={handleLogout} variant="destructive" className="w-full">
                  <Icon name="LogOut" size={18} className="mr-2" />
                  Выйти из системы
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;