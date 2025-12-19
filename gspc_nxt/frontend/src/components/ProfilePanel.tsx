import { useEffect, useMemo, useState } from 'react';
import { useGraphStore } from '../stores/useGraphStore';
import { useUserStore } from '../stores/useUserStore';

const SIGNATURE_LIMIT = 160;

interface ProfilePanelProps {
  onZoomSelf: () => void;
}

export const ProfilePanel = ({ onZoomSelf }: ProfilePanelProps) => {
  const userId = useUserStore((state) => state.userId);
  const logout = useUserStore((state) => state.logout);
  const nodes = useGraphStore((state) => state.nodes);
  const updateSignature = useGraphStore((state) => state.updateSignature);
  const [signatureInput, setSignatureInput] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const currentUser = useMemo(
    () => nodes.find((node) => node.id === userId),
    [nodes, userId],
  );

  useEffect(() => {
    if (currentUser?.signature) {
      setSignatureInput(currentUser.signature);
    }
  }, [currentUser?.signature]);

  const handleSignatureUpdate = async () => {
    if (!userId) {
      return;
    }
    setIsSaving(true);
    setStatusMessage(null);
    try {
      await updateSignature(userId, signatureInput);
      setStatusMessage('Signature updated.');
    } catch (error) {
      setStatusMessage('Unable to update signature.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <aside className="profile-hud">
      <header className="profile-header">
        <div className="profile-identity">
          <img src={currentUser?.avatar} alt="" />
          <div>
            <h3>{currentUser?.name ?? '...'}</h3>
            <p>@{currentUser?.username ?? 'loading'}</p>
            <span>ID {currentUser?.id ?? '—'}</span>
          </div>
        </div>
        <div className="profile-actions">
          <button type="button" className="ghost" onClick={onZoomSelf}>
            🎯 Zoom to me
          </button>
          <button type="button" className="danger" onClick={logout}>
            ⏻ Logout
          </button>
        </div>
      </header>
      <div className="signature-block">
        <p className="signature-label">Signature</p>
        <p className="signature-current">
          {currentUser?.signature ?? 'No gossip yet.'}
        </p>
        <textarea
          rows={2}
          value={signatureInput}
          maxLength={SIGNATURE_LIMIT}
          placeholder="Update your signature..."
          onChange={(event) => setSignatureInput(event.target.value)}
        />
        <div className="signature-footer">
          <span>
            {signatureInput.length} / {SIGNATURE_LIMIT}
          </span>
          <button
            type="button"
            onClick={handleSignatureUpdate}
            disabled={isSaving || signatureInput.trim().length === 0}
          >
            {isSaving ? 'Saving...' : 'Update'}
          </button>
        </div>
        {statusMessage ? <p className="signature-status">{statusMessage}</p> : null}
      </div>
    </aside>
  );
};
