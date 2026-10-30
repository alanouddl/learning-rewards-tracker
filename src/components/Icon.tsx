import {
  AlarmClock, BarChart3, BicepsFlexed, BookOpen, Brain, Calculator, Calendar, CalendarCheck, CalendarDays, Check,
  CircleCheck, Clock, Cloud, CloudSun, ClipboardList, Coins, Crown, ExternalLink, Flag, Flame, Flower, Flower2, FolderOpen,
  Frown, Gem, Gift, GraduationCap, Hand, Headphones, Heart, Hourglass, Map as MapIcon, House, Image, Languages, Laptop, Lightbulb, Link, Lock,
  Medal, Meh, MessageCircle, MessageCircleHeart, Mic, Moon, NotebookPen, Paperclip, PartyPopper, Pause, PenLine, Pencil,
  PiggyBank, Play, Puzzle, Rainbow, Receipt, Rocket, ScrollText, Settings, Shield, Smile, Sparkle, Sparkles, Sprout, Star,
  Sun, Target, Timer, Trash2, TrendingUp, TriangleAlert, Trophy, Wallet, Wrench, type LucideIcon,
} from 'lucide-react';

const ICONS = {
  alarm: AlarmClock, chart: BarChart3, strong: BicepsFlexed, book: BookOpen, brain: Brain, calculator: Calculator,
  calendar: Calendar, 'calendar-check': CalendarCheck, 'calendar-days': CalendarDays, check: Check, done: CircleCheck,
  clock: Clock, cloud: Cloud, 'cloud-sun': CloudSun, clipboard: ClipboardList, coins: Coins, crown: Crown,
  external: ExternalLink, flag: Flag, flame: Flame, flower: Flower, tulip: Flower2, folder: FolderOpen, frown: Frown,
  gem: Gem, gift: Gift, graduation: GraduationCap, hand: Hand, headphones: Headphones, map: MapIcon, heart: Heart, hourglass: Hourglass, house: House,
  image: Image, languages: Languages, laptop: Laptop, idea: Lightbulb, link: Link, lock: Lock, medal: Medal, meh: Meh,
  message: MessageCircle, love: MessageCircleHeart, mic: Mic, moon: Moon, notebook: NotebookPen, clip: Paperclip,
  party: PartyPopper, pause: Pause, pen: PenLine, pencil: Pencil, piggy: PiggyBank, play: Play, puzzle: Puzzle,
  rainbow: Rainbow, receipt: Receipt, rocket: Rocket, scroll: ScrollText, settings: Settings, shield: Shield,
  smile: Smile, sparkle: Sparkle, sparkles: Sparkles, sprout: Sprout, star: Star, sun: Sun, target: Target, timer: Timer,
  trash: Trash2, trend: TrendingUp, alert: TriangleAlert, trophy: Trophy, wallet: Wallet, wrench: Wrench,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

/** Line icon that inherits the surrounding text colour. */
export function I({ n, className = '', size = 18 }: { n: IconName; className?: string; size?: number }) {
  const C = ICONS[n] ?? Sparkle;
  return <C aria-hidden="true" size={size} strokeWidth={1.8} className={`inline-block shrink-0 align-[-0.2em] ${className}`} />;
}

/** Icon inside a soft pink circle, used for headings, stats and badges. */
export function IconBubble({ n, tone = 'pink', size = 'h-9 w-9', icon = 18 }: { n: IconName; tone?: 'pink' | 'gold' | 'mint' | 'lilac' | 'blue' | 'butter' | 'muted'; size?: string; icon?: number }) {
  const t = { pink: 'bg-blush-100 text-blush-500', gold: 'bg-blush-100 text-blush-500', mint: 'bg-mint-100 text-mint-500', lilac: 'bg-lav-100 text-lav-500', blue: 'bg-sky-100 text-sky-400', butter: 'bg-cream-100 text-[#c99a06]', muted: 'bg-[#f3f1f6] text-plum-faint' }[tone];
  return <span className={`grid shrink-0 place-items-center rounded-2xl ${size} ${t}`}><I n={n} size={icon} /></span>;
}

/** Icon for a reward category, picked from its name. */
export function categoryIcon(name: string): IconName {
  const s = name.toLowerCase();
  if (s.includes('english')) return 'languages';
  if (s.includes('program') || s.includes('logic')) return 'puzzle';
  if (s.includes('computer') || s.includes('ai')) return 'laptop';
  if (s.includes('financ') || s.includes('money')) return 'piggy';
  if (s.includes('communic') || s.includes('confid')) return 'mic';
  if (s.includes('time') || s.includes('habit')) return 'alarm';
  return 'book';
}

export type Tone = 'pink' | 'lilac' | 'mint' | 'butter' | 'blue';
const TONES: Tone[] = ['pink', 'lilac', 'mint', 'butter', 'blue'];
/** A stable pastel colour per subject. */
export function categoryTone(name: string): Tone {
  const order: [string, Tone][] = [['english', 'pink'], ['program', 'lilac'], ['computer', 'blue'], ['financ', 'mint'], ['communic', 'butter'], ['time', 'lilac']];
  return order.find(([k]) => name.toLowerCase().includes(k))?.[1] ?? 'pink';
}
export const toneAt = (i: number): Tone => TONES[i % TONES.length];

// Text that comes from the database (notifications, messages) may still contain emoji: strip it for display.
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{231A}-\u{23FF}\u{1F000}-\u{1F2FF}][\u{FE0F}\u{200D}\u{1F3FB}-\u{1F3FF}\u{2640}\u{2642}]*/gu;
export const noEmoji = (s: string) => s.replace(EMOJI, '').replace(/\s{2,}/g, ' ').trim();
