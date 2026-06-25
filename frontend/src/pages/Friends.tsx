import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchFriends,
  fetchPendingRequests,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend
} from '../services/api';
import { Button } from '../components/Button/Button';
import { Input } from '../components/Input/Input';
import { Card } from '../components/Card/Card';
import { ConfirmModal } from '../components/ConfirmModal/ConfirmModal';
import { useToast } from '../hooks/useToast';
import styles from './Friends.module.css';

export function Friends() {
  const [usernameInput, setUsernameInput] = useState('');
  const [confirmRemove, setConfirmRemove] = useState<{ id: string; name: string } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: friends, isLoading: loadingFriends } = useQuery({
    queryKey: ['friends'],
    queryFn: fetchFriends,
    refetchInterval: 10000,
  });

  const { data: pendingRequests, isLoading: loadingPending } = useQuery({
    queryKey: ['pendingRequests'],
    queryFn: fetchPendingRequests,
    refetchInterval: 10000,
  });

  // Mutations
  const sendRequestMutation = useMutation({
    mutationFn: (username: string) => sendFriendRequest(username),
    onSuccess: () => {
      toast('Friend request sent successfully!', 'success');
      setUsernameInput('');
      queryClient.invalidateQueries({ queryKey: ['pendingRequests'] });
    },
    onError: (err: any) => {
      toast(err.message || 'Failed to send friend request.', 'error');
    },
  });

  const acceptMutation = useMutation({
    mutationFn: (id: string) => acceptFriendRequest(id),
    onSuccess: () => {
      toast('Friend request accepted!', 'success');
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['pendingRequests'] });
    },
    onError: (err: any) => {
      toast(err.message || 'Failed to accept friend request.', 'error');
    },
  });

  const declineMutation = useMutation({
    mutationFn: (id: string) => declineFriendRequest(id),
    onSuccess: () => {
      toast('Friend request declined.', 'success');
      queryClient.invalidateQueries({ queryKey: ['pendingRequests'] });
    },
    onError: (err: any) => {
      toast(err.message || 'Failed to decline friend request.', 'error');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => removeFriend(id),
    onSuccess: () => {
      toast('Friend removed successfully.', 'success');
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
    onError: (err: any) => {
      toast(err.message || 'Failed to remove friend.', 'error');
    },
  });

  const handleSendRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const target = usernameInput.trim();
    if (!target) {
      toast('Please enter a username', 'error');
      return;
    }
    sendRequestMutation.mutate(target);
  };

  const sentRequests = pendingRequests?.filter((r) => r.direction === 'SENT') || [];
  const receivedRequests = pendingRequests?.filter((r) => r.direction === 'RECEIVED') || [];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            <span className={styles.titlePrefix}>&gt; </span>
            Friends Hub
          </h1>
          <p className={styles.subtitle}>Connect with friends to share server hosting experiences</p>
        </div>
      </div>

      <div className={styles.layout}>
        {/* Main section: Friends list */}
        <div className={styles.mainSection}>
          <Card variant="glass" className={`${styles.card} cyber-frame`}>
            <h2 className={styles.cardTitle}>
              <span className={styles.prompt}>$</span> cat friends.txt
            </h2>
            {loadingFriends ? (
              <p className={styles.loading}>Accessing friends registry...</p>
            ) : friends && friends.length > 0 ? (
              <div className={styles.friendsList}>
                {friends.map((friend) => (
                  <div key={friend.id} className={styles.friendItem}>
                    <div className={styles.friendInfo}>
                      <span className={styles.avatar}>
                        {friend.friendUsername[0].toUpperCase()}
                      </span>
                      <div>
                        <div className={styles.friendName}>{friend.friendUsername}</div>
                        <div className={styles.friendEmail}>{friend.friendEmail}</div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={styles.removeBtn}
                      onClick={() => setConfirmRemove({ id: friend.id, name: friend.friendUsername })}
                    >
                      Disconnect
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>👥</span>
                <h3>No friends found in database</h3>
                <p>Add friends using the sidebar to see them here.</p>
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar: Add Friend and Requests */}
        <div className={styles.sidebar}>
          {/* Add Friend card */}
          <Card variant="glass" className={`${styles.card} cyber-frame`}>
            <h2 className={styles.cardTitle}>
              <span className={styles.prompt}>$</span> add-friend --user
            </h2>
            <form onSubmit={handleSendRequest} className={styles.addForm}>
              <Input
                label="Friend's Username"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="Enter username"
                disabled={sendRequestMutation.isPending}
              />
              <Button
                type="submit"
                className={styles.submitBtn}
                loading={sendRequestMutation.isPending}
              >
                Send Request
              </Button>
            </form>
          </Card>

          {/* Pending Requests card */}
          <Card variant="glass" className={`${styles.card} cyber-frame`}>
            <h2 className={styles.cardTitle}>
              <span className={styles.prompt}>$</span> tail pending_reqs.log
            </h2>
            {loadingPending ? (
              <p className={styles.loading}>Reading log...</p>
            ) : (receivedRequests.length > 0 || sentRequests.length > 0) ? (
              <div className={styles.requestsSection}>
                {receivedRequests.length > 0 && (
                  <div className={styles.reqGroup}>
                    <div className={styles.groupHeader}>Received ({receivedRequests.length})</div>
                    {receivedRequests.map((req) => (
                      <div key={req.id} className={styles.reqItem}>
                        <span className={styles.reqName}>{req.friendUsername}</span>
                        <div className={styles.reqActions}>
                          <button
                            className={styles.acceptBtn}
                            onClick={() => acceptMutation.mutate(req.id)}
                            title="Accept"
                          >
                            ✓
                          </button>
                          <button
                            className={styles.declineBtn}
                            onClick={() => declineMutation.mutate(req.id)}
                            title="Decline"
                          >
                            ✗
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {sentRequests.length > 0 && (
                  <div className={styles.reqGroup}>
                    <div className={styles.groupHeader}>Sent ({sentRequests.length})</div>
                    {sentRequests.map((req) => (
                      <div key={req.id} className={styles.reqItem}>
                        <span className={styles.reqName}>{req.friendUsername}</span>
                        <button
                          className={styles.cancelBtn}
                          onClick={() => declineMutation.mutate(req.id)}
                          title="Cancel"
                        >
                          Cancel
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className={styles.noRequests}>No pending transactions</p>
            )}
          </Card>
        </div>
      </div>

      <ConfirmModal
        open={!!confirmRemove}
        title="Remove Friend"
        message={`Are you sure you want to remove ${confirmRemove?.name ?? ''}?`}
        confirmLabel="Remove"
        confirmVariant="danger"
        loading={removeMutation.isPending}
        onConfirm={() => {
          if (confirmRemove) {
            removeMutation.mutate(confirmRemove.id);
            setConfirmRemove(null);
          }
        }}
        onCancel={() => setConfirmRemove(null)}
      />
    </div>
  );
}
