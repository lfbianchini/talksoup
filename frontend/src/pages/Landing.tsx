import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSocket';
import { useToast } from '../components/ui/use-toast';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '../components/ui/card';
import { 
  Users, 
  KeyRound, 
  Shuffle, 
  Zap, 
  MessageSquare, 
  Sparkles,
  TriangleAlert
} from 'lucide-react';

export function Landing() {
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { ws, isConnected } = useWebSocket();

  const handleCreateLobby = () => {
    if (!ws || !isConnected) {
      console.error('WebSocket not connected. Connection state:', { ws, isConnected });
      toast({
        title: "Error",
        description: "Not connected to server. Please try again.",
        variant: "destructive",
      });
      return;
    }

    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a lobby name",
        variant: "destructive",
      });
      return;
    }

    if (!capacity || isNaN(Number(capacity)) || Number(capacity) < 2 || Number(capacity) > 10) {
      toast({
        title: "Error",
        description: "Please enter a valid capacity between 2 and 10",
        variant: "destructive",
      });
      return;
    }

    const message = {
      type: 'create_lobby',
      name: name.trim(),
      capacity: Number(capacity)
    };

    console.log('Sending create lobby message:', message);
    try {
      ws.send(JSON.stringify(message));
      // Clear the form after sending
      setName('');
      setCapacity('');
    } catch (error) {
      console.error('Error sending create lobby message:', error);
      toast({
        title: "Error",
        description: "Failed to send message to server",
        variant: "destructive",
      });
    }
  };

  const handleJoinRandomLobby = () => {
    if (!ws || !isConnected) {
      console.error('WebSocket not connected. Connection state:', { ws, isConnected });
      toast({
        title: "Error",
        description: "Not connected to server. Please try again.",
        variant: "destructive",
      });
      return;
    }

    const message = {
      type: 'join_random_lobby'
    };

    console.log('Sending join random lobby message:', message);
    try {
      ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('Error sending join random lobby message:', error);
      toast({
        title: "Error",
        description: "Failed to send message to server",
        variant: "destructive",
      });
    }
  };

  // Set up WebSocket message handler (fixed with proper useEffect)
  useEffect(() => {
    if (!ws || !isConnected) {
      console.log('WebSocket not ready:', { ws, isConnected });
      return;
    }

    console.log('Setting up message handler. Connection state:', { isConnected });

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Received message:', data);

        switch (data.type) {
          case 'lobby_created':
            console.log('Lobby created:', data.data);
            if (data.data && data.data.id) {
              console.log('Navigating to lobby:', data.data.id);
              navigate(`/lobby/${data.data.id}`);
            } else {
              console.error('Invalid lobby created response:', data);
              toast({
                title: "Error",
                description: "Failed to create lobby: Invalid response from server",
                variant: "destructive",
              });
            }
            break;
          case 'lobby_joined':
            console.log('Joined lobby:', data.data);
            if (data.data && data.data.id) {
              console.log('Navigating to lobby:', data.data.id);
              navigate(`/lobby/${data.data.id}`);
            } else {
              console.error('Invalid lobby joined response:', data);
              toast({
                title: "Error",
                description: "Failed to join lobby: Invalid response from server",
                variant: "destructive",
              });
            }
            break;
          case 'error':
            console.error('Error:', data.data);
            toast({
              title: "Error",
              description: data.data,
              variant: "destructive",
            });
            break;
        }
      } catch (error) {
        console.error('Error parsing message:', error);
        toast({
          title: "Error",
          description: "Failed to parse server response",
          variant: "destructive",
        });
      }
    };

    ws.addEventListener('message', handleMessage);
    return () => {
      console.log('Cleaning up message handler');
      ws.removeEventListener('message', handleMessage);
    };
  }, [ws, isConnected, navigate, toast]); // Added proper dependencies

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/30">
      <div className="container mx-auto px-4 py-12 flex flex-col items-center">
        {/* Hero Section */}
        <div className="w-full max-w-6xl mb-16 text-center">
          <div className="mb-8 inline-block animate-fade-in-up">
            <Badge variant="outline" className="px-4 py-1 text-lg bg-background/80 backdrop-blur-sm">
              <Sparkles size={16} className="mr-1 text-primary" /> 
              Welcome to TalkSoup
            </Badge>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent animate-pulse-soft">
            Spark Conversations
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Join a game of thought-provoking questions and creative answers. 
            Connect with friends or meet new people in this exciting social experience.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {!isConnected && (
              <div className="w-full max-w-md p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center">
                <TriangleAlert className="text-destructive mr-2" size={20} />
                <p className="text-sm text-destructive">Not connected to server. Please refresh and try again.</p>
              </div>
            )}
          </div>
        </div>

        {/* Game Options Section */}
        <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {/* Create Lobby Card */}
          <div className="animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <Card className="h-full border-2 hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-xl bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl">Create a Lobby</CardTitle>
                  <KeyRound className="text-primary" size={24} />
                </div>
                <CardDescription>
                  Start a new game with custom settings
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">
                    Lobby Name
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter a catchy name for your lobby"
                    className="border-primary/20 focus:border-primary"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="capacity" className="text-sm font-medium">
                    Player Capacity
                  </Label>
                  <div className="relative">
                    <Input
                      id="capacity"
                      type="number"
                      min="2"
                      max="10"
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                      placeholder="2-10 players"
                      className="border-primary/20 focus:border-primary pl-9"
                    />
                    <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Choose between 2-10 players for your lobby
                  </p>
                </div>
              </CardContent>
              
              <CardFooter>
                <Button 
                  onClick={handleCreateLobby} 
                  className="w-full bg-primary hover:bg-primary/90 text-white gap-2"
                  disabled={!isConnected}
                >
                  <Zap size={18} />
                  Create Your Lobby
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Join Random Lobby Card */}
          <div className="animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            <Card className="h-full border-2 hover:border-accent/50 transition-all duration-300 shadow-lg hover:shadow-xl bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl">Join Random Lobby</CardTitle>
                  <Shuffle className="text-accent" size={24} />
                </div>
                <CardDescription>
                  Quickly jump into an available game
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="bg-accent/20 p-2 rounded-full">
                      <Zap size={18} className="text-accent" />
                    </div>
                    <div>
                      <h4 className="font-medium">Quick Start</h4>
                      <p className="text-sm text-muted-foreground">
                        Get matched with an available lobby instantly
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="bg-accent/20 p-2 rounded-full">
                      <MessageSquare size={18} className="text-accent" />
                    </div>
                    <div>
                      <h4 className="font-medium">Meet New People</h4>
                      <p className="text-sm text-muted-foreground">
                        Join other players and start conversations
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter>
                <Button 
                  onClick={handleJoinRandomLobby} 
                  variant="outline"
                  className="w-full border-accent text-accent hover:bg-accent hover:text-accent-foreground gap-2"
                  disabled={!isConnected}
                >
                  <Shuffle size={18} />
                  Find a Random Lobby
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>

        {/* Features Section */}
        <div className="w-full max-w-6xl mb-16">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold">How It Works</h2>
            <p className="text-muted-foreground mt-2">A simple way to engage in meaningful conversations</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <Users className="text-primary" size={24} />,
                title: "Join a Lobby",
                description: "Create your own lobby or join an existing one with friends or strangers."
              },
              {
                icon: <MessageSquare className="text-primary" size={24} />,
                title: "Answer Questions",
                description: "Respond to thought-provoking questions with your unique perspective."
              },
              {
                icon: <Sparkles className="text-primary" size={24} />,
                title: "Vote & Discuss",
                description: "Vote on the best answers and engage in discussions with other players."
              }
            ].map((feature, i) => (
              <div 
                key={i} 
                className="bg-card/80 backdrop-blur-sm rounded-xl p-6 shadow-md animate-fade-in-up"
                style={{ animationDelay: `${0.4 + i * 0.1}s` }}
              >
                <div className="bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
