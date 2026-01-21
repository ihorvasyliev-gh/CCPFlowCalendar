import React, { useState } from 'react';
import { MessageCircle, Send, User } from 'lucide-react';
import { EventComment } from '../types';

interface EventCommentsProps {
  comments: EventComment[];
  currentUserId: string;
  currentUserName: string;
  onAddComment: (content: string) => Promise<void>;
}

const EventComments: React.FC<EventCommentsProps> = ({
  comments,
  currentUserId,
  currentUserName,
  onAddComment
}) => {
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddComment(newComment.trim());
      setNewComment('');
    } catch (err) {
      console.error('Failed to add comment', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-6 border-t border-gray-200 pt-4">
      <div className="flex items-center mb-4">
        <MessageCircle className="h-5 w-5 text-gray-400 mr-2" />
        <h4 className="text-sm font-medium text-gray-900">Comments ({comments.length})</h4>
      </div>

      {/* Comments List */}
      <div className="space-y-4 mb-4 max-h-64 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No comments yet. Be the first to comment!</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium text-gray-900">{comment.userName}</p>
                  <span className="text-xs text-gray-500">
                    {new Date(comment.createdAt).toLocaleDateString()} at{' '}
                    {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{comment.content}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Comment Form */}
      <form onSubmit={handleSubmit} className="flex items-start space-x-2">
        <div className="flex-1">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            rows={2}
            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm resize-none"
          />
        </div>
        <button
          type="submit"
          disabled={!newComment.trim() || isSubmitting}
          className="flex-shrink-0 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
};

export default EventComments;
