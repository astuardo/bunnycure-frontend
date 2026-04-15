import { Card, Alert, Badge, Button, ButtonGroup } from 'react-bootstrap';
import { Award, CheckCircle, Plus, Minus } from 'lucide-react';

interface StampCardProps {
  loyaltyStamps?: number;
  totalCompletedVisits?: number;
  onAdjust?: (delta: number) => void;
}

export default function StampCard({ 
  loyaltyStamps = 0, 
  totalCompletedVisits = 0,
  onAdjust 
}: StampCardProps) {
  const maxStamps = 10;
  
  // Calculate how many stamps to show on the current card
  const currentStamps = loyaltyStamps > 0 && loyaltyStamps % maxStamps === 0 
    ? maxStamps 
    : loyaltyStamps % maxStamps;
    
  const isRewardAvailable = loyaltyStamps >= maxStamps;

  return (
    <Card className="mb-4 shadow-sm border-0">
      <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
        <h5 className="mb-0 d-flex align-items-center gap-2">
          <Award size={20} />
          Tarjeta de Fidelización
        </h5>
        <Badge bg="light" text="dark" className="rounded-pill">
          Histórico: {totalCompletedVisits} visitas
        </Badge>
      </Card.Header>
      <Card.Body className="text-center">
        {isRewardAvailable && (
          <Alert variant="success" className="d-flex align-items-center justify-content-center gap-2 mb-4 py-2">
            <CheckCircle size={20} />
            <strong>¡Recompensa Disponible!</strong> Este cliente ha completado su tarjeta.
          </Alert>
        )}
        
        <div className="d-flex justify-content-center align-items-center gap-3 mb-4">
          <p className="text-muted mb-0">
            Progreso actual: <strong>{currentStamps} / {maxStamps}</strong> sellos
          </p>
          
          {onAdjust && (
            <ButtonGroup size="sm">
              <Button 
                variant="outline-danger" 
                onClick={() => onAdjust(-1)}
                disabled={loyaltyStamps <= 0}
                title="Quitar un sello manualmente"
              >
                <Minus size={14} />
              </Button>
              <Button 
                variant="outline-success" 
                onClick={() => onAdjust(1)}
                title="Agregar un sello manualmente (Concursos, etc.)"
              >
                <Plus size={14} />
              </Button>
            </ButtonGroup>
          )}
        </div>

        <div className="d-flex flex-wrap justify-content-center gap-3">
          {Array.from({ length: maxStamps }).map((_, index) => {
            const isFilled = index < currentStamps;
            return (
              <div 
                key={index} 
                className={`d-flex align-items-center justify-content-center rounded-circle ${
                  isFilled ? 'bg-primary text-white shadow-sm' : 'bg-light text-muted border border-2'
                }`}
                style={{ 
                  width: '50px', 
                  height: '50px',
                  transition: 'all 0.3s ease',
                  transform: isFilled ? 'scale(1.05)' : 'scale(1)'
                }}
              >
                {isFilled ? <Award size={24} /> : <span>{index + 1}</span>}
              </div>
            );
          })}
        </div>
        
        <div className="mt-4 pt-3 border-top text-start">
          <small className="text-muted">
            <em>Nota:</em> Al marcar una cita como "Completada", se agregará automáticamente un sello.
          </small>
        </div>
      </Card.Body>
    </Card>
  );
}
