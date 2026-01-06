import { useState } from 'react';
import { X, Star, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface FeedbackPopupProps {
  open: boolean;
  onClose: () => void;
}

export function FeedbackPopup({ open, onClose }: FeedbackPopupProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedback, setFeedback] = useState('');

  const handleSubmit = () => {
    const subject = encodeURIComponent('Feedback for fractalito');
    const body = encodeURIComponent(`Rating: ${rating}/5 stars\n\nFeedback:\n${feedback}`);
    window.location.href = `mailto:altay.said@fermaniq.com?subject=${subject}&body=${body}`;
    
    // Reset form
    setRating(0);
    setFeedback('');
    onClose();
  };

  if (!open) return null;

  return (
    <div className="absolute right-4 bottom-16 md:bottom-16 w-72 bg-green-600 rounded-xl shadow-2xl p-4 z-50 animate-in slide-in-from-bottom-2 fade-in duration-200">
      {/* Close button */}
      <button 
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
        onClick={handleSubmit}
        disabled={rating === 0}
        className="w-full bg-white text-green-700 hover:bg-white/90 font-medium text-sm"
        size="sm"
      >
        <Send className="h-3.5 w-3.5 mr-1.5" />
        Send Feedback
      </Button>
    </div>
  );
}
