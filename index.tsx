
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';

// --- AUDIO MANAGER ---
// Generates all sounds for the game using the Web Audio API.
class AudioManager {
    audioContext;
    isInitialized = false;
    isMuted = false;
    isMusicMuted = true;
    masterGain;
    musicGain;
    musicTimeout;

    constructor() {
        if (window.AudioContext) {
            this.audioContext = new window.AudioContext();
            this.masterGain = this.audioContext.createGain();
            this.musicGain = this.audioContext.createGain();
            this.musicGain.connect(this.masterGain);
            this.masterGain.connect(this.audioContext.destination);
        }
    }

    init() {
        if (this.isInitialized || !this.audioContext) return;
        this.audioContext.resume();
        this.isInitialized = true;
        if (this.isMusicMuted) { // Initialize music state without playing
             this.musicGain.gain.setValueAtTime(0, this.audioContext.currentTime);
        }
    }

    toggleMute() {
        if (!this.audioContext) return;
        this.isMuted = !this.isMuted;
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.audioContext.currentTime);
    }
    
    toggleMusicMute() {
        if (!this.audioContext) return;
        this.isMusicMuted = !this.isMusicMuted;
        if (!this.isMusicMuted && !this.musicTimeout) {
            this.playMusic();
        }
        this.musicGain.gain.setValueAtTime(this.isMusicMuted ? 0 : 0.1, this.audioContext.currentTime);
    }
    
    playMusic() {
        if (!this.audioContext || this.isMusicMuted) return;
        clearTimeout(this.musicTimeout);

        const now = this.audioContext.currentTime;
        const tempo = 120;
        const quarterNote = 60 / tempo;
        const measure = quarterNote * 4;

        const harpMelody = [
            { freq: 523.25, time: 0 }, { freq: 659.26, time: quarterNote }, { freq: 783.99, time: quarterNote * 2 }, { freq: 987.77, time: quarterNote * 3 },
            { freq: 783.99, time: measure }, { freq: 587.33, time: measure + quarterNote }, { freq: 493.88, time: measure + quarterNote * 2 }, { freq: 392.00, time: measure + quarterNote * 3 },
        ];
        
        harpMelody.forEach(note => {
            const startTime = now + note.time;
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(note.freq, startTime);
            gain.gain.setValueAtTime(0.3, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + quarterNote * 2);
            osc.connect(gain).connect(this.musicGain);
            osc.start(startTime);
            osc.stop(startTime + quarterNote * 2);
        });

        const stringPad = [ { freq: 130.81, time: 0, duration: measure * 2 }, { freq: 110.00, time: measure * 2, duration: measure * 2 } ];

        stringPad.forEach(note => {
            for (let i = 0; i < 3; i++) {
                const startTime = now + note.time;
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                osc.type = 'sine';
                const detune = i === 0 ? 0 : (i === 1 ? 4 : -4);
                osc.frequency.setValueAtTime(note.freq + detune, startTime);
                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(0.02, startTime + quarterNote);
                gain.gain.linearRampToValueAtTime(0.0, startTime + note.duration);
                osc.connect(gain).connect(this.musicGain);
                osc.start(startTime);
                osc.stop(startTime + note.duration);
            }
        });

        const loopDuration = measure * 4;
        this.musicTimeout = setTimeout(() => this.playMusic(), loopDuration * 1000);
    }
    
    _createSingingVoice(baseFreq, duration, startTime) {
        if (!this.audioContext) return;
        const now = this.audioContext.currentTime;
        const time = startTime || now;

        for (let i = 0; i < 4; i++) { // Layer for a chorus/ethereal effect
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            const lfo = this.audioContext.createOscillator();
            const lfoGain = this.audioContext.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(baseFreq + (i * 2 - 2), time); // Detune slightly
            lfo.type = 'sine';
            lfo.frequency.setValueAtTime(5 + Math.random(), time); // Vibrato
            lfoGain.gain.setValueAtTime(3, time);
            lfo.connect(lfoGain).connect(osc.frequency);

            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.08, time + 0.2); // Fade in
            gain.gain.linearRampToValueAtTime(0, time + duration); // Fade out

            osc.connect(gain).connect(this.masterGain);
            osc.start(time);
            lfo.start(time);
            osc.stop(time + duration);
            lfo.stop(time + duration);
        }
    }


    play(sound, ...args) {
        if (!this.isInitialized || !this.audioContext) return;
        const now = this.audioContext.currentTime;

        switch (sound) {
             case 'genieSound': this._createSingingVoice(659.26, 1.5, now); break;
            case 'callGenie': this._createSingingVoice(783.99, 2.0, now); break;
             case 'refillComplete': this._createSingingVoice(987.77, 2.5, now); break;
            case 'clawDamage': {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(120, now);
                osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
                gain.gain.setValueAtTime(0.4, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                osc.connect(gain).connect(this.masterGain);
                osc.start(now);
                osc.stop(now + 0.3);
                break;
            }
            case 'failGrab': {
                 this._createSingingVoice(392, 1.0, now);
                break;
            }
            case 'levelStart': { 
                const notes = [523.25, 659.26, 783.99, 1046.50, 783.99, 1046.50, 1318.51];
                notes.forEach((freq, i) => {
                    const time = now + i * 0.1;
                    const osc = this.audioContext.createOscillator();
                    const gain = this.audioContext.createGain();
                    osc.type = i % 2 === 0 ? 'triangle' : 'sine'; 
                    osc.frequency.setValueAtTime(freq, time);
                    gain.gain.setValueAtTime(0.3, time);
                    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
                    osc.connect(gain).connect(this.masterGain);
                    osc.start(time);
                    osc.stop(time + 0.5);
                });
                break;
            }
            case 'timesUp': this._createSingingVoice(523.25, 2.5, now); break;
            case 'win': {
                 const notes = [783.99, 1046.50, 1318.51, 1567.98];
                 notes.forEach((freq, i) => {
                    const time = now + i * 0.08;
                    const osc = this.audioContext.createOscillator();
                    const gain = this.audioContext.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, time);
                    gain.gain.setValueAtTime(0.25, time);
                    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
                    osc.connect(gain).connect(this.masterGain);
                    osc.start(time);
                    osc.stop(time + 0.5);
                 });
                break;
            }
            case 'move': {
                const osc = this.audioContext.createOscillator();
                osc.type = 'square';
                osc.frequency.setValueAtTime(150 + Math.random() * 50, now);
                const gain = this.audioContext.createGain();
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                osc.connect(gain).connect(this.masterGain);
                osc.start(now);
                osc.stop(now + 0.1);
                break;
            }
            case 'grab': {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(300, now);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                osc.connect(gain).connect(this.masterGain);
                osc.start(now);
                osc.stop(now + 0.2);
                break;
            }
             case 'squealaCry': { 
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                const lfo = this.audioContext.createOscillator();
                const lfoGain = this.audioContext.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(800, now);
                lfo.type = 'sine';
                lfo.frequency.setValueAtTime(8, now); 
                lfoGain.gain.setValueAtTime(25, now); 
                lfo.connect(lfoGain).connect(osc.frequency);
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.4, now + 0.1);
                gain.gain.linearRampToValueAtTime(0.2, now + 0.4); 
                gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
                osc.connect(gain).connect(this.masterGain);
                lfo.start(now);
                osc.start(now);
                lfo.stop(now + 1.2);
                osc.stop(now + 1.2);
                break;
            }
            case 'buy': {
                const notes = [523.25, 659.26, 783.99]; // C5, E5, G5
                notes.forEach((freq, i) => {
                    const osc = this.audioContext.createOscillator();
                    const gain = this.audioContext.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, now + i * 0.1);
                    gain.gain.setValueAtTime(0.2, now + i * 0.1);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.2);
                    osc.connect(gain).connect(this.masterGain);
                    osc.start(now + i * 0.1);
                    osc.stop(now + i * 0.1 + 0.2);
                });
                break;
            }
            case 'uiClick': {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(1200, now);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                osc.connect(gain).connect(this.masterGain);
                osc.start(now);
                osc.stop(now + 0.1);
                break;
            }
            case 'refill': {
                for (let i = 0; i < 5; i++) {
                    const osc = this.audioContext.createOscillator();
                    const gain = this.audioContext.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(1000 + Math.random() * 1000, now + i * 0.05);
                    gain.gain.setValueAtTime(0.2, now + i * 0.05);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.2);
                    osc.connect(gain).connect(this.masterGain);
                    osc.start(now + i * 0.05);
                    osc.stop(now + i * 0.05 + 0.2);
                }
                break;
            }
            case 'petDeploy': {
                const notes = [440, 554, 659];
                notes.forEach((freq, i) => {
                    const osc = this.audioContext.createOscillator();
                    const gain = this.audioContext.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, now + i * 0.15);
                    gain.gain.setValueAtTime(0.2, now + i * 0.15);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.3);
                    osc.connect(gain).connect(this.masterGain);
                    osc.start(now + i * 0.15);
                    osc.stop(now + i * 0.15 + 0.3);
                });
                break;
            }
            case 'petCatch': {
                this.play('win'); // Reuse win sound for now
                break;
            }
            case 'petDamage': {
                const osc = this.audioContext.createOscillator();
                osc.type = 'square';
                osc.frequency.setValueAtTime(100, now);
                osc.frequency.exponentialRampToValueAtTime(30, now + 0.4);
                const gain = this.audioContext.createGain();
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
                osc.connect(gain).connect(this.masterGain);
                osc.start(now);
                osc.stop(now + 0.4);
                break;
            }
            case 'petDie': {
                 this._createSingingVoice(329.63, 2.0, now); // E4
                 this._createSingingVoice(261.63, 2.0, now + 0.2); // C4
                break;
            }
        }
    }
}
const audioManager = new AudioManager();

const SQUEALA_RARITIES = {
    COMMON: { name: 'Common', points: 50, style: { background: 'purple' }, damage: 5 },
    UNCOMMON: { name: 'Uncommon', points: 100, style: { background: 'linear-gradient(135deg, deeppink, purple)' }, damage: 8 },
    RARE: { name: 'Rare', points: 300, style: { background: 'linear-gradient(135deg, deeppink, blue, purple, magenta)' }, hasWings: true, damage: 12 },
    EPIC: { name: 'Epic', points: 500, style: { background: 'linear-gradient(135deg, red, orange, yellow, green, blue)' }, hasWings: true, bigWings: true, damage: 18 },
    LEGENDARY: { name: 'Legendary', points: 1000, style: { background: 'linear-gradient(135deg, blue, purple, green, magenta, deeppink, orange)' }, hasWings: true, bigWings: true, hasHorns: true, damage: 25 },
    MYTHICAL: { name: 'Mythical', points: 5000, style: { background: 'linear-gradient(135deg, red, orange, yellow, green, blue, purple)' }, hasWings: true, hasHorns: true, damage: 35 },
    DIVINE: { name: 'Divine', points: 10000, style: { background: 'linear-gradient(135deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #8f00ff)', mist: { background: 'deeppink' } }, hasWings: true, hasHorns: true, damage: 50 },
    PRISMATIC: { name: 'Prismatic', points: 1000000, style: { background: 'linear-gradient(135deg, red, orange, yellow, lime, cyan, blue, violet)', mist: { background: 'linear-gradient(135deg, red, orange, yellow, lime, cyan, blue, violet)' } }, hasWings: true, bigWings: true, hasHorns: true, damage: 75 },
};

const PETS = [
    { id: 'lila', name: 'Lila', description: 'Pink cat with a mermaid tail.', cost: 300, icon: '🧜‍♀️', baseHealth: 75 },
    { id: 'moline', name: 'Moline', description: 'Pink and purple fairy poodle.', cost: 500, icon: '🐩', baseHealth: 100 },
    { id: 'dogily', name: 'Dogily', description: 'A powerful dragon dog.', cost: 1000, icon: '🐉', baseHealth: 150 },
    { id: 'genia', name: 'Genia', description: 'Purple genie cat.', cost: 1500, icon: '🧞‍♀️', baseHealth: 120 },
];

const GAME_WIDTH = 100;
const CLAW_WIDTH = 10;
const SQUEALA_WIDTH = 10;
const CLAW_MAX_Y = 75;
const MAX_CLAW_HEALTH = 100;
const MAX_MIST_CHARGES = 5;

const Squeala = ({ squeala, style = {} }) => {
    const rarity = SQUEALA_RARITIES[squeala.rarity];
    return (
        <div className="squeala" style={{ ...rarity.style, left: `${squeala.x}%`, top: `${squeala.y}%`, ...style }}>
            <div className="eye-container">
                <div className="eye"><div className="pupil"></div></div>
                <div className="eye"><div className="pupil"></div></div>
            </div>
            <div className="mouth"></div>
            <div className="ear left"></div>
            <div className="ear right"></div>
            {rarity.hasWings && ( <> <div className={`wing left ${rarity.bigWings ? 'big-wing' : ''}`}></div> <div className={`wing right ${rarity.bigWings ? 'big-wing' : ''}`}></div> </> )}
            {rarity.hasHorns && ( <> <div className="horn left"></div> <div className="horn right"></div> </> )}
            {rarity.mist && <div className="mist" style={rarity.mist}></div>}
        </div>
    );
};

const Claw = ({ x, y, open, clawState, isDamaged, bitingSqueala }) => {
    const classes = `claw ${clawState !== 'ready' ? 'auto-move' : ''} ${isDamaged ? 'damaged' : ''}`;
    return (
        <div className={classes} style={{ left: `${x}%`, top: `${y}%` }}>
            <div className="claw-arm"></div>
            <div className="claw-base">
                <div className={`pincer left ${!open ? 'closed' : ''}`}></div>
                <div className={`pincer right ${!open ? 'closed' : ''}`}></div>
            </div>
            {bitingSqueala && (
                <div className="biting-squeala-wrapper">
                    <Squeala squeala={bitingSqueala} />
                </div>
            )}
        </div>
    );
};

const GenieCat = () => (
    <div className="genie-cat">
        <div className="genie-cat-head">
            <div className="ear left"></div>
            <div className="ear right"></div>
            <div className="eye-container">
                <div className="eye"><div className="pupil"></div></div>
                <div className="eye"><div className="pupil"></div></div>
            </div>
            <div className="mouth"></div>
        </div>
        <div className="genie-cat-body">
        </div>
        <div className="genie-cat-hand left"></div>
        <div className="genie-cat-hand right"></div>
        <div className="genie-cat-mist"></div>
    </div>
);


const GenieFlyby = () => (
    <div className="genie-flyby-container">
        <GenieCat />
    </div>
);

const MistBottle = ({ mistCharges, isRefilling }) => (
    <div className={`mist-bottle ${isRefilling ? 'refilling' : ''}`}>
        <div className="crystal-top"></div>
        <div className="bottle-body">
            <div className="mist-liquid" style={{ height: `${(mistCharges / MAX_MIST_CHARGES) * 100}%` }}>
                 <div className="stardust"></div>
            </div>
            <div className="charge-count">{mistCharges}</div>
        </div>
    </div>
);

const MistBottleFlyby = ({ target }) => (
    <div className="mist-bottle-flyby" style={{ '--target-x': `${target.x}%`, '--target-y': `${target.y}%` } as React.CSSProperties}>
        <div className="mist-bottle-visual">
            <div className="crystal-top"></div>
            <div className="bottle-body"></div>
        </div>
    </div>
);

const ClawHealthBar = ({ health }) => (
    <div className="health-bar-container">
        <div className="health-bar-label">Claw HP</div>
        <div className="health-bar">
            <div className="health-bar-fill" style={{ width: `${health}%` }}></div>
        </div>
    </div>
);

const EnchantedGenieLamp = () => (
    <div className="genie-lamp">
        <div className="lamp-base"></div>
        <div className="lamp-body">
            <div className="lamp-paw">🐾</div>
        </div>
        <div className="lamp-spout"></div>
    </div>
);

const GenieRefillAnimation = ({ refillStage }) => (
     <div className={`genie-refill-container ${refillStage}`}>
        <GenieCat />
        <MistBottle mistCharges={refillStage === 'filling' ? MAX_MIST_CHARGES : 0} isRefilling={true} />
     </div>
);

const Pet = ({ pet }) => {
    const petInfo = PETS.find(p => p.id === pet.id);
    return (
        <div className="pet" style={{ left: `${pet.x}%`, top: `${pet.y}%` }}>
            {petInfo.icon}
        </div>
    );
};

const PetHUD = ({ pet }) => {
    const petInfo = PETS.find(p => p.id === pet.id);
    const healthPercent = (pet.health / petInfo.baseHealth) * 100;
    return (
        <div className="pet-hud-container">
            <div className="pet-hud-icon">{petInfo.icon}</div>
            <div className="health-bar-container pet-health">
                <div className="health-bar">
                    <div className="health-bar-fill" style={{ width: `${healthPercent}%` }}></div>
                </div>
            </div>
        </div>
    );
};

const VictoryAnimation = () => (
    <div className="victory-animation-container">
        <GenieCat />
    </div>
);


const Game = ({ setScore, setCollectedSquealas, isGameActive, onGameWin, activePet, setActivePet, setOwnedPets }) => {
    const [squealas, setSquealas] = useState([]);
    const [clawX, setClawX] = useState(50);
    const [clawY, setClawY] = useState(0);
    const [pincersOpen, setPincersOpen] = useState(true);
    const [clawState, setClawState] = useState('ready');
    const [heldSqueala, setHeldSqueala] = useState(null);
    const [showGenie, setShowGenie] = useState(false);
    const [clawHealth, setClawHealth] = useState(MAX_CLAW_HEALTH);
    const [mistCharges, setMistCharges] = useState(MAX_MIST_CHARGES);
    const [mistActive, setMistActive] = useState(false);
    const [isRefilling, setIsRefilling] = useState(false);
    const [refillStage, setRefillStage] = useState('');
    const [isDamaged, setIsDamaged] = useState(false);
    const [bitingSqueala, setBitingSqueala] = useState(null);
    const [mistAnimation, setMistAnimation] = useState(null);
    const petLogicInterval = useRef(null);
    const squealasCaughtThisRound = useRef(0);

    const generateSquealas = useCallback(() => {
        const newSquealas = [];
        for (let i = 0; i < 15; i++) {
            const rand = Math.random() * 100;
            let rarity;
            if (rand < 10) rarity = 'COMMON'; 
            else if (rand < 25) rarity = 'UNCOMMON'; 
            else if (rand < 45) rarity = 'RARE'; 
            else if (rand < 65) rarity = 'EPIC'; 
            else if (rand < 80) rarity = 'LEGENDARY'; 
            else if (rand < 90) rarity = 'MYTHICAL'; 
            else if (rand < 96) rarity = 'DIVINE'; 
            else rarity = 'PRISMATIC';
            newSquealas.push({ id: Date.now() + i, rarity, x: Math.random() * (GAME_WIDTH - SQUEALA_WIDTH), y: 60 + Math.random() * 30 });
        }
        setSquealas(prev => [...prev.slice(-5), ...newSquealas]); // Keep some old ones to avoid sudden disappearance
    }, []);
    
    useEffect(() => {
        if (isGameActive) {
            squealasCaughtThisRound.current = 0;
            generateSquealas();
        } else {
             setSquealas([]);
        }
    }, [isGameActive, generateSquealas]);

    useEffect(() => {
        if (activePet && isGameActive && squealas.length > 0) {
            petLogicInterval.current = setInterval(() => {
                setActivePet(prevPet => {
                    if (!prevPet) return null;

                    const target = squealas[Math.floor(Math.random() * squealas.length)];
                    const newPetState = { ...prevPet };

                    newPetState.x += (Math.random() - 0.5) * 10;
                    newPetState.y += (Math.random() - 0.5) * 5;
                    newPetState.x = Math.max(0, Math.min(GAME_WIDTH - SQUEALA_WIDTH, newPetState.x));
                    newPetState.y = Math.max(60, Math.min(90, newPetState.y));
                    
                    const dx = target.x - newPetState.x;
                    const dy = target.y - newPetState.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);

                    if (dist < 15) { // If close enough, attempt catch
                        if (Math.random() > 0.5) { // Success
                            const points = SQUEALA_RARITIES[target.rarity].points;
                            setScore(prev => prev + points);
                            setCollectedSquealas(prev => new Set(prev).add(target.rarity));
                            setSquealas(prev => prev.filter(s => s.id !== target.id));
                            audioManager.play('petCatch');
                        } else { // Fail, chance to be attacked
                             if (Math.random() > 0.4) {
                                const damage = SQUEALA_RARITIES[target.rarity].damage;
                                newPetState.health -= damage;
                                audioManager.play('petDamage');
                                audioManager.play('squealaCry');
                                if (newPetState.health <= 0) {
                                    audioManager.play('petDie');
                                    setOwnedPets(prev => prev.filter(pId => pId !== newPetState.id));
                                    return null; // Pet dies
                                }
                            }
                        }
                    }
                    return newPetState;
                });
            }, 2000);
        }
        return () => clearInterval(petLogicInterval.current);
    }, [activePet, isGameActive, squealas, setActivePet, setScore, setCollectedSquealas, setOwnedPets]);
    
    const moveClaw = (dx, dy) => {
        if (clawState !== 'ready' || !isGameActive || isRefilling) return;
        audioManager.play('move');
        setClawX(prev => Math.max(0, Math.min(GAME_WIDTH - CLAW_WIDTH, prev + dx)));
        setClawY(prev => Math.max(0, Math.min(CLAW_MAX_Y, prev + dy)));
    };

    const handleUseMist = () => {
        if (mistCharges > 0 && clawState === 'ready') {
            setMistActive(prev => !prev);
        }
    };

    const handleCallGenie = () => {
        if (isRefilling || clawState !== 'ready' || mistCharges > 0) return;
        setIsRefilling(true);
        audioManager.play('callGenie');
        setRefillStage('summoning');
        setTimeout(() => { setRefillStage('filling'); audioManager.play('genieSound'); }, 2000);
        setTimeout(() => { setMistCharges(MAX_MIST_CHARGES); audioManager.play('refillComplete'); }, 4000);
        setTimeout(() => { setRefillStage('departing'); }, 4500);
        setTimeout(() => { setIsRefilling(false); setRefillStage(''); }, 6500);
    };

    const handleGrab = () => {
        if (clawState !== 'ready' || !isGameActive || isRefilling || clawHealth <= 0) return;

        const useMistOnThisGrab = mistActive && mistCharges > 0;

        const executeGrab = (isGuaranteed, targetSqueala = null) => {
            setClawState('dropping');
            setClawY(CLAW_MAX_Y);
            audioManager.play('grab');

            setTimeout(() => { // After drop animation
                setPincersOpen(false);

                let caughtSqueala = targetSqueala;
                let successfulGrab = isGuaranteed;

                if (!caughtSqueala) {
                    const clawCenterX = clawX + CLAW_WIDTH / 2;
                    const candidates = squealas.filter(s =>
                        Math.abs((s.x + SQUEALA_WIDTH / 2) - clawCenterX) < (SQUEALA_WIDTH / 2 + CLAW_WIDTH / 4) && s.y > CLAW_MAX_Y - 5
                    );
                    if (candidates.length > 0) {
                        caughtSqueala = candidates.reduce((bottom, current) => (bottom.y > current.y ? bottom : current));
                    }
                }
                
                if (caughtSqueala) {
                    if (!isGuaranteed) {
                        if (Math.random() > 0.4) {
                            successfulGrab = true;
                        } else {
                            successfulGrab = false;
                            const rarityData = SQUEALA_RARITIES[caughtSqueala.rarity];
                            setClawHealth(prev => Math.max(0, prev - rarityData.damage));
                            setIsDamaged(true);
                            setTimeout(() => setIsDamaged(false), 300);
                            audioManager.play('squealaCry');
                            audioManager.play('clawDamage');
                            setBitingSqueala(caughtSqueala);
                            setSquealas(prev => prev.filter(s => s.id !== caughtSqueala.id));
                        }
                    }
                    if (successfulGrab) {
                        setHeldSqueala(caughtSqueala);
                        audioManager.play('squealaCry');
                        setSquealas(prev => prev.filter(s => s.id !== caughtSqueala.id));
                    }
                } else {
                    audioManager.play('failGrab');
                    successfulGrab = false;
                }

                setClawState('rising');
                setClawY(0);

                setTimeout(() => { // After rise animation
                    setPincersOpen(true);
                    if (successfulGrab && caughtSqueala) {
                        const points = SQUEALA_RARITIES[caughtSqueala.rarity].points;
                        setScore(prev => prev + points);
                        setCollectedSquealas(prev => new Set(prev).add(caughtSqueala.rarity));
                        
                        squealasCaughtThisRound.current += 1;
                        const superRares = ['MYTHICAL', 'DIVINE', 'PRISMATIC'];
                        if (squealasCaughtThisRound.current >= 10 || superRares.includes(caughtSqueala.rarity)) {
                            onGameWin();
                        } else {
                            audioManager.play('win');
                            setShowGenie(true);
                            audioManager.play('genieSound');
                            setTimeout(() => setShowGenie(false), 2000);
                        }
                    }
                    
                    setHeldSqueala(null);
                    setBitingSqueala(null);
                    setClawState('ready');

                    if (squealas.length < 10) {
                         audioManager.play('refill');
                         generateSquealas();
                    }
                }, 1500); // Rise time
            }, 1500); // Drop time
        };

        if (useMistOnThisGrab) {
            const clawCenterX = clawX + CLAW_WIDTH / 2;
            const candidates = squealas.filter(s => Math.abs((s.x + SQUEALA_WIDTH / 2) - clawCenterX) < SQUEALA_WIDTH / 2);
            let potentialTarget = candidates.length > 0 ? candidates.reduce((bottom, current) => (bottom.y > current.y ? bottom : current)) : null;

            if (potentialTarget) {
                setClawState('misting');
                setMistCharges(prev => Math.max(0, prev - 1));
                setMistActive(false);
                setMistAnimation({ x: potentialTarget.x, y: potentialTarget.y });
                setTimeout(() => {
                    setMistAnimation(null);
                    executeGrab(true, potentialTarget);
                }, 1000);
            } else {
                 executeGrab(false);
            }
        } else {
            executeGrab(false);
        }
    };
    
    const isButtonDisabled = clawState !== 'ready' || !isGameActive || isRefilling || clawHealth <= 0;

    return (
        <>
            <div className="game-area">
                {squealas.map(s => <Squeala key={s.id} squeala={s} />)}
                <Claw x={clawX} y={clawY} open={pincersOpen} clawState={clawState} isDamaged={isDamaged} bitingSqueala={bitingSqueala} />
                {heldSqueala && <Squeala squeala={heldSqueala} style={{ left: `${clawX}%`, top: `${clawY + 5}%`, transition: 'top 1.5s ease-in-out' }} />}
                {showGenie && <GenieFlyby />}
                {isRefilling && <GenieRefillAnimation refillStage={refillStage}/>}
                {mistAnimation && <MistBottleFlyby target={mistAnimation} />}
                {activePet && <Pet pet={activePet} />}
            </div>
            <div className="game-hud">
                <ClawHealthBar health={clawHealth} />
                {activePet && <PetHUD pet={activePet} />}
                <MistBottle mistCharges={mistCharges} isRefilling={isRefilling} />
            </div>
            <div className="controls">
                 <EnchantedGenieLamp />
                <div className="action-buttons">
                    <button className="control-btn call-genie" onClick={handleCallGenie} disabled={isButtonDisabled || mistCharges > 0}>CALL GENIE</button>
                    <button className={`control-btn use-mist ${mistActive ? 'active' : ''}`} onClick={handleUseMist} disabled={isButtonDisabled || mistCharges <= 0}>USE MIST</button>
                    <button className="control-btn grab" onClick={handleGrab} disabled={isButtonDisabled}>GRAB</button>
                </div>
                <div className="d-pad">
                    <button className="control-btn" onClick={() => moveClaw(0, -5)} disabled={isButtonDisabled}>⬆️</button>
                    <button className="control-btn" onClick={() => moveClaw(-5, 0)} disabled={isButtonDisabled}>⬅️</button>
                    <button className="control-btn" onClick={() => moveClaw(5, 0)} disabled={isButtonDisabled}>➡️</button>
                    <button className="control-btn" onClick={() => moveClaw(0, 5)} disabled={isButtonDisabled}>⬇️</button>
                </div>
            </div>
        </>
    );
};

const Shop = ({ score, setScore, ownedPets, setOwnedPets, deployPet, activePet }) => {
    const buyPet = (pet) => {
        if (score >= pet.cost && !ownedPets.includes(pet.id)) {
            audioManager.play('buy');
            setScore(prev => prev - pet.cost);
            setOwnedPets(prev => [...prev, pet.id]);
        }
    };
    
    return (
        <div className="shop-container">
            <h2>Magical Pets Store</h2>
            {PETS.map(pet => {
                const isOwned = ownedPets.includes(pet.id);
                const isActive = activePet?.id === pet.id;
                return (
                    <div key={pet.id} className="pet-card">
                        <span className="pet-icon">{pet.icon}</span>
                        <div className="pet-info">
                            <h3>{pet.name}</h3>
                            <p>{pet.description}</p>
                            <p>Cost: {pet.cost} points</p>
                        </div>
                        <button 
                            className={`pet-buy-btn ${isOwned ? 'deploy' : ''} ${isActive ? 'active' : ''}`}
                            onClick={() => isOwned ? deployPet(pet.id) : buyPet(pet)}
                            disabled={!isOwned && score < pet.cost}
                        >
                            {isActive ? 'Active' : isOwned ? 'Deploy' : 'Buy'}
                        </button>
                    </div>
                );
            })}
        </div>
    );
};

const CollectionIndex = ({ ownedPets, collectedSquealas, deployPet, activePet }) => {
    const myPets = PETS.filter(pet => ownedPets.includes(pet.id));

    return (
        <div className="collection-container">
            <h2>My Collection</h2>
            
            <h3 className="collection-subtitle">Magical Pets</h3>
            {myPets.length === 0 ? (
                <p className="no-pets-message">You don't own any magical pets yet.</p>
            ) : (
                myPets.map(pet => {
                    const isActive = activePet?.id === pet.id;
                    return (
                        <div key={pet.id} className="pet-card">
                            <span className="pet-icon">{pet.icon}</span>
                            <div className="pet-info">
                                <h3>{pet.name}</h3>
                                <p>{pet.description}</p>
                            </div>
                             <button 
                                className={`pet-buy-btn deploy ${isActive ? 'active' : ''}`}
                                onClick={() => deployPet(pet.id)}
                            >
                                {isActive ? 'Active' : 'Deploy'}
                            </button>
                        </div>
                    );
                })
            )}

            <h3 className="collection-subtitle">Squeala-Dex</h3>
            <div className="squeala-collection-grid">
                {Object.entries(SQUEALA_RARITIES).map(([rarityKey, rarityData]) => {
                    const isCollected = collectedSquealas.has(rarityKey);
                    return (
                        <div key={rarityKey} className={`squeala-collection-item ${isCollected ? 'collected' : ''}`}>
                            {isCollected ? (
                                <div className="squeala-display">
                                    <Squeala squeala={{ rarity: rarityKey, x: 0, y: 0 }} />
                                </div>
                            ) : (
                                <div className="squeala-placeholder">?</div>
                            )}
                            <span className="squeala-rarity-name">
                                {isCollected ? rarityData.name : '???'}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const SquealaViewer = () => {
    return (
        <div className="squeala-viewer-container">
            <h2>Squeala Designs</h2>
            <div className="squeala-viewer-grid">
                {Object.entries(SQUEALA_RARITIES).map(([rarityKey, rarityData]) => (
                    <div key={rarityKey} className="squeala-viewer-item">
                        <div className="squeala-display">
                            <Squeala squeala={{ rarity: rarityKey, x: 0, y: 0 }} />
                        </div>
                        <div className="squeala-info">
                            <span className="squeala-rarity-name">{rarityData.name}</span>
                            <span className="squeala-points">{rarityData.points} Points</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};


const App = () => {
    const [score, setScore] = useState(0);
    const [view, setView] = useState('game'); // game, shop, collection, or viewer
    const [ownedPets, setOwnedPets] = useState([]);
    const [collectedSquealas, setCollectedSquealas] = useState(new Set());
    const [isMuted, setIsMuted] = useState(false);
    const [isMusicMuted, setIsMusicMuted] = useState(true);
    const [activePet, setActivePet] = useState(null);
    
    const [timeLeft, setTimeLeft] = useState(600);
    const [gameStatus, setGameStatus] = useState('idle'); // idle, playing, ended, won
    const timerRef = useRef(null);

    useEffect(() => {
        if (gameStatus === 'playing' && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft <= 0 && gameStatus === 'playing') {
            clearInterval(timerRef.current);
            setGameStatus('ended');
            audioManager.play('timesUp');
        }
        return () => clearInterval(timerRef.current);
    }, [gameStatus, timeLeft]);
    
    const startGame = () => {
        audioManager.play('levelStart');
        setScore(0);
        setTimeLeft(600);
        setGameStatus('playing');
        setActivePet(null);
    };

    const handleWin = () => {
        clearInterval(timerRef.current);
        setGameStatus('won');
         audioManager.play('win');
    };

    const deployPet = (petId) => {
        if (activePet?.id === petId) { // Undeploy
            setActivePet(null);
        } else if (ownedPets.includes(petId)) {
            const petData = PETS.find(p => p.id === petId);
            setActivePet({ 
              id: petId, 
              health: petData.baseHealth, 
              x: 50, y: 80, 
            });
            audioManager.play('petDeploy');
        }
    };

    const handleInteraction = () => audioManager.init();
    const toggleSound = () => {
        audioManager.toggleMute();
        setIsMuted(prev => !prev);
    };
    const toggleMusic = () => {
        audioManager.toggleMusicMute();
        setIsMusicMuted(prev => !prev);
    };
    const changeView = (newView) => {
        audioManager.play('uiClick');
        setView(newView);
    };

    return (
        <div className="app-container" onClick={handleInteraction}>
            <div className="header">
                <h1>Squeala Claw</h1>
                <div className="sound-controls">
                    <button className={`sound-toggle music ${isMusicMuted ? 'muted' : ''}`} onClick={toggleMusic}>🎶</button>
                    <button className="sound-toggle" onClick={toggleSound}>{isMuted ? '🔇' : '🔊'}</button>
                </div>
            </div>
            <div className="info-bar">
                <span>Points: {score}</span>
                {view === 'game' && gameStatus !== 'idle' && <span className="timer">Time: {timeLeft}s</span>}
                <div className="nav-buttons">
                    {view === 'game' ? (
                        <>
                            <button onClick={() => changeView('shop')}>Pet Shop</button>
                            <button onClick={() => changeView('collection')}>Collection</button>
                            <button onClick={() => changeView('viewer')}>Squeala Viewer</button>
                        </>
                    ) : ( <button onClick={() => changeView('game')}>Back to Game</button> )}
                </div>
            </div>
            
            {view === 'game' && (
                <div className="game-wrapper">
                    {gameStatus !== 'playing' && (
                        <div className="game-overlay">
                            {gameStatus === 'won' && <VictoryAnimation />}
                            <h2>
                                {gameStatus === 'idle' && 'Ready to Play?'}
                                {gameStatus === 'ended' && "Time's Up!"}
                                {gameStatus === 'won' && 'YOU WIN!'}
                            </h2>
                            {(gameStatus === 'ended' || gameStatus === 'won') && <p className="final-score">Final Score: {score}</p>}
                            <button className="start-btn" onClick={startGame}>
                                {gameStatus === 'idle' ? 'Start Game' : 'Play Again'}
                            </button>
                        </div>
                    )}
                    <Game 
                        setScore={setScore} 
                        setCollectedSquealas={setCollectedSquealas} 
                        isGameActive={gameStatus === 'playing'}
                        onGameWin={handleWin}
                        activePet={activePet}
                        setActivePet={setActivePet}
                        setOwnedPets={setOwnedPets}
                    />
                </div>
            )}
            {view === 'shop' && <Shop score={score} setScore={setScore} ownedPets={ownedPets} setOwnedPets={setOwnedPets} deployPet={deployPet} activePet={activePet} />}
            {view === 'collection' && <CollectionIndex ownedPets={ownedPets} collectedSquealas={collectedSquealas} deployPet={deployPet} activePet={activePet} />}
            {view === 'viewer' && <SquealaViewer />}
        </div>
    );
};

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
