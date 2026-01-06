import { useState } from 'react';
import { X, Star, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface FeedbackPopupProps {
  open: boolean;
  onClose: () => void;
}

export function FeedbackPopup({ open, onClose }: FeedbackPopupProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('https://formspree.io/f/xeeoyqvb', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Rating: ${rating}/5 stars\n\nFeedback:\n${feedback}`,
        }),
      });

      if (response.ok) {
        toast.success('Thank you for your feedback!');
        setRating(0);
        setFeedback('');
        onClose();
      } else {
        toast.error('Failed to send feedback. Please try again.');
      }
    } catch (error) {
      toast.error('Failed to send feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <form 
      onSubmit={handleSubmit} 
      className="absolute right-4 bottom-16 md:bottom-16 w-72 bg-green-600 rounded-xl shadow-2xl p-4 z-50 animate-in slide-in-from-bottom-2 fade-in duration-200"
    >
      {/* Close button */}
      <button 
        type="button"
        onClick={onClose}
        className="absolute top-2 right-2 text-white/80 hover:text-white transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
      
      <h3 className="text-white font-semibold text-sm mb-3">Share your feedback</h3>
      
      {/* Star rating */}
      <div className="flex items-center gap-1 mb-3">
        <span className="text-white/80 text-xs mr-2">Rating:</span>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`h-5 w-5 transition-colors ${
                star <= (hoveredRating || rating)
                  ? 'fill-yellow-300 text-yellow-300'
                  : 'text-white/40'
              }`}
            />
          </button>
        ))}
      </div>
      
      {/* Feedback input */}
      <Textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Tell us what you think..."
        className="bg-white/20 border-white/30 text-white placeholder:text-white/50 text-sm resize-none h-20 mb-3"
      />
      
      {/* Submit button */}
      <Button
        type="submit"
        disabled={rating === 0 || isSubmitting}
        className="w-full bg-white text-green-700 hover:bg-white/90 font-medium text-sm"
        size="sm"
      >
        {isSubmitting ? (
          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
        ) : (
          <Send className="h-3.5 w-3.5 mr-1.5" />
        )}
        {isSubmitting ? 'Sending...' : 'Send Feedback'}
      </Button>
    </form>
  );
}
