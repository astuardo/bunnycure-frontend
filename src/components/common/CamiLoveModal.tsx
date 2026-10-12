import React, { useState, useEffect } from 'react';
import { FaHeart } from 'react-icons/fa';
import { Modal } from '../ui';
import { useAuthStore } from '../../stores/authStore';
import {
  isCamiUser,
  hasSeenTodayLoveNote,
  markTodayLoveNoteAsSeen,
  fetchDailyLoveNote,
  getRandomLoveNote,
  LoveNote,
  CURATED_LOVE_NOTES,
} from '../../services/loveNotes.service';
import './CamiLoveModal.css';

interface CamiLoveModalProps {
  forceOpen?: boolean;
  onCloseManual?: () => void;
}

export const CamiLoveModal: React.FC<CamiLoveModalProps> = ({ forceOpen, onCloseManual }) => {
  const user = useAuthStore((state) => state.user);
  const [show, setShow] = useState<boolean>(false);
  const [currentNote, setCurrentNote] = useState<LoveNote>(CURATED_LOVE_NOTES[0]);

  useEffect(() => {
    if (forceOpen) {
      setShow(true);
      return;
    }

    // Verificar si el usuario logueado es Cami Reyes y si es la primera vez en el día
    if (user && isCamiUser(user.username)) {
      if (!hasSeenTodayLoveNote()) {
        // Cargar frase del día
        fetchDailyLoveNote().then((note) => {
          setCurrentNote(note);
          setShow(true);
        });
      }
    }
  }, [user, forceOpen]);

  const handleClose = () => {
    markTodayLoveNoteAsSeen();
    setShow(false);
    if (onCloseManual) {
      onCloseManual();
    }
  };

  const handleNextMessage = () => {
    const next = getRandomLoveNote(currentNote.id);
    setCurrentNote(next);
  };

  if (!show) return null;

  return (
    <Modal
      show={show}
      onHide={handleClose}
      centered
      backdrop="static"
      keyboard={false}
      size="md"
      className="cami-love-modal"
    >
      {/* Fondo de corazones flotantes */}
      <div className="floating-hearts-container">
        <span className="floating-heart">❤️</span>
        <span className="floating-heart">💖</span>
        <span className="floating-heart">✨</span>
        <span className="floating-heart">🌸</span>
        <span className="floating-heart">💕</span>
      </div>

      <div className="p-6 relative z-10">
        {/* Encabezado */}
        <div className="cami-love-header">
          <div className="cami-avatar-heart">
            <FaHeart />
          </div>
          <h4 className="cami-love-title">¡Hola, mi amor! 💖</h4>
          <p className="cami-love-subtitle">Un mensajito especial para iluminar tu día</p>
        </div>

        {/* Tarjeta con el Mensaje */}
        <div className="cami-love-card">
          <p className="cami-love-quote">“{currentNote.message}”</p>
          {currentNote.author && (
            <p className="cami-love-author">~ {currentNote.author}</p>
          )}
        </div>

        {/* Acciones */}
        <div className="cami-love-actions">
          <button
            type="button"
            className="btn-cami-love flex items-center justify-center gap-2 w-full cursor-pointer"
            onClick={handleClose}
          >
            <FaHeart className="text-white" />
            <span>¡Empezar un día hermoso! ✨</span>
          </button>

          <button
            type="button"
            className="btn-cami-another flex items-center justify-center gap-2 w-full cursor-pointer"
            onClick={handleNextMessage}
          >
            <span>💌 Leer otro mensajito de amor</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
