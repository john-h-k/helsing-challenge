import React from 'react';
import { Card, Typography, List, ListItem, ListItemText, Box, Chip } from '@mui/material';
import { Warning, TrendingUp, Timeline } from '@mui/icons-material';
import styled from '@emotion/styled';
import { Event } from '../types/Event';

const PopupCard = styled(Card)`
  position: absolute;
  background: linear-gradient(
    135deg,
    rgba(26, 26, 26, 0.95) 0%,
    rgba(38, 38, 38, 0.95) 100%
  );
  color: white;
  padding: 24px;
  min-width: 320px;
  max-width: 400px;
  border-radius: 12px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);
  animation: fadeIn 0.3s ease-out;

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const SeverityChip = styled(Chip)<{ severity: string }>`
  background: ${props => 
    props.severity === 'high' ? 'rgba(255, 68, 68, 0.15)' : 
    props.severity === 'medium' ? 'rgba(255, 170, 0, 0.15)' : 
    'rgba(0, 170, 0, 0.15)'};
  color: ${props => 
    props.severity === 'high' ? '#ff4444' : 
    props.severity === 'medium' ? '#ffaa00' : 
    '#00aa00'};
  border: 1px solid ${props => 
    props.severity === 'high' ? 'rgba(255, 68, 68, 0.3)' : 
    props.severity === 'medium' ? 'rgba(255, 170, 0, 0.3)' : 
    'rgba(0, 170, 0, 0.3)'};
  margin-bottom: 16px;
`;

const PotentialEventCard = styled(Box)`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 12px;
  margin: 8px 0;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    transform: translateX(4px);
  }
`;

const ProgressBar = styled.div<{ value: number; color: string }>`
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  position: relative;
  margin-top: 8px;

  &:after {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: ${props => props.value}%;
    background: ${props => props.color};
    border-radius: 2px;
    transition: width 0.3s ease;
  }
`;

interface EventPopupProps {
  event: Event;
  position: { x: number; y: number };
}

const EventPopup: React.FC<EventPopupProps> = ({ event, position }) => {
  return (
    <PopupCard style={{ left: position.x, top: position.y }}>
      <SeverityChip
        severity={event.severity}
        label={event.severity.toUpperCase()}
        size="small"
        icon={<Warning />}
      />
      
      <Typography variant="h6" sx={{ 
        mb: 1,
        fontWeight: 600,
        letterSpacing: '0.5px'
      }}>
        {event.title}
      </Typography>

      <Typography variant="body2" sx={{ 
        color: 'rgba(255,255,255,0.7)',
        mb: 3,
        lineHeight: 1.6
      }}>
        {event.description}
      </Typography>

      {event.potentialEvents && event.potentialEvents.length > 0 && (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
            <Timeline sx={{ color: 'rgba(255,255,255,0.5)' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
              Potential Impacts
            </Typography>
          </Box>

          {event.potentialEvents.map(potential => (
            <PotentialEventCard key={potential.id}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
                <TrendingUp sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 20 }} />
                <Typography variant="subtitle2">
                  {potential.title}
                </Typography>
              </Box>
              
              <Typography variant="body2" sx={{ 
                color: 'rgba(255,255,255,0.6)',
                fontSize: '0.85rem',
                mb: 2
              }}>
                {potential.description}
              </Typography>

              <Box sx={{ mb: 1 }}>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                  Probability
                </Typography>
                <ProgressBar 
                  value={potential.probability * 100} 
                  color="rgba(64, 156, 255, 0.8)"
                />
              </Box>

              <Box>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                  Impact
                </Typography>
                <ProgressBar 
                  value={potential.impact * 100}
                  color="rgba(255, 89, 89, 0.8)"
                />
              </Box>
            </PotentialEventCard>
          ))}
        </>
      )}
    </PopupCard>
  );
};

export default EventPopup;
