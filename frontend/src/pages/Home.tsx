import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSocket';
import { useToast } from '../components/ui/use-toast';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';

export function Home() {
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
  }, [ws, isConnected, navigate, toast]);

  return (
    <div className="container mx-auto p-4">
      <div className="max-w-md mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Create a Lobby</CardTitle>
            <CardDescription>Start a new game with your friends</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Lobby Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter lobby name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity">Player Capacity</Label>
              <Input
                id="capacity"
                type="number"
                min="2"
                max="10"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="Enter capacity (2-10)"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleCreateLobby} className="w-full">
              Create Lobby
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Join a Random Lobby</CardTitle>
            <CardDescription>Find a game to join</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Join a random lobby with available space or create a new one automatically.
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={handleJoinRandomLobby} className="w-full">
              Join Random Lobby
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
} 