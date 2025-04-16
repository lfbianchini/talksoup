import React from 'react';
import { WebSocketUser } from '../types/websocket';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import UserAvatar from './UserAvatar';

interface UserProfileModalProps {
  user: WebSocketUser | null;
  isOpen: boolean;
  onClose: () => void;
  onAddFriend: (userId: string) => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  isOpen,
  onClose,
  onAddFriend
}) => {
  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>User Profile</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <UserAvatar user={user} size="lg" />
          <h2 className="text-2xl font-bold">{user.username}</h2>
          <Button onClick={() => onAddFriend(user.id)}>
            Add Friend
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserProfileModal;
