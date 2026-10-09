/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { FreeFireLobbyView } from './components/FreeFireLobbyView';
import { BattleRoyaleGameView } from './components/BattleRoyaleGameView';
import { DailyMissions } from './components/DailyMissions';
import { UserProfile } from './components/UserProfile';
import { WeaponShop } from './components/WeaponShop';
import { SettingsModal } from './components/SettingsModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { seedMissions, getUserProfile } from './services/userService';

type ScreenMode = 'lobby' | 'game';
type ActiveModal = 'none' | 'shop' | 'missions' | 'profile' | 'settings';

export default function App() {
  const [screenMode, setScreenMode] = useState<ScreenMode>('lobby');
  const [activeModal, setActiveModal] = useState<ActiveModal>('none');
  const [currency, setCurrency] = useState(150);
  const [highScore, setHighScore] = useState(0);
  const [highWave, setHighWave] = useState(1);

  const refreshProfile = async () => {
    const prof = await getUserProfile();
    setCurrency(prof.currency);
    setHighScore(prof.highScore);
    setHighWave(prof.highWave);
  };

  useEffect(() => {
    seedMissions();
    refreshProfile();

    const handleUpdate = () => {
      refreshProfile();
    };

    window.addEventListener('focus', handleUpdate);
    window.addEventListener('equipSkin', handleUpdate);
    return () => {
      window.removeEventListener('focus', handleUpdate);
      window.removeEventListener('equipSkin', handleUpdate);
    };
  }, []);

  return (
    <div className="w-screen h-screen overflow-hidden bg-black text-white">
      {screenMode === 'lobby' ? (
        <FreeFireLobbyView
          currency={currency}
          highScore={highScore}
          highWave={highWave}
          onStartGame={() => setScreenMode('game')}
          onOpenShop={() => setActiveModal('shop')}
          onOpenMissions={() => setActiveModal('missions')}
          onOpenProfile={() => setActiveModal('profile')}
          onOpenSettings={() => setActiveModal('settings')}
        />
      ) : (
        <BattleRoyaleGameView
          onExitToLobby={() => {
            setScreenMode('lobby');
            refreshProfile();
          }}
        />
      )}

      {/* MODAL DIALOGS OVER LOBBY */}
      {activeModal !== 'none' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-2xl my-auto animate-in fade-in zoom-in-95 duration-150">
            {activeModal === 'shop' && <WeaponShop onClose={() => setActiveModal('none')} />}
            {activeModal === 'missions' && <DailyMissions onClose={() => setActiveModal('none')} />}
            {activeModal === 'profile' && <UserProfile onClose={() => setActiveModal('none')} />}
            {activeModal === 'settings' && <SettingsModal onClose={() => setActiveModal('none')} />}
          </div>
        </div>
      )}

      {/* Offline Alert Indicator */}
      <OfflineIndicator />
    </div>
  );
}
