<script lang="ts" module>
	import Accessibility from '@lucide/svelte/icons/accessibility';
	import Activity from '@lucide/svelte/icons/activity';
	import Ambulance from '@lucide/svelte/icons/ambulance';
	import Armchair from '@lucide/svelte/icons/armchair';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Award from '@lucide/svelte/icons/award';
	import Baby from '@lucide/svelte/icons/baby';
	import BadgeCheck from '@lucide/svelte/icons/badge-check';
	import Bell from '@lucide/svelte/icons/bell';
	import Bone from '@lucide/svelte/icons/bone';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import Bot from '@lucide/svelte/icons/bot';
	import Brain from '@lucide/svelte/icons/brain';
	import BriefcaseMedical from '@lucide/svelte/icons/briefcase-medical';
	import Calendar from '@lucide/svelte/icons/calendar';
	import CalendarCheck from '@lucide/svelte/icons/calendar-check';
	import Car from '@lucide/svelte/icons/car';
	import Check from '@lucide/svelte/icons/check';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ClipboardList from '@lucide/svelte/icons/clipboard-list';
	import Clock from '@lucide/svelte/icons/clock';
	import Coffee from '@lucide/svelte/icons/coffee';
	import Copy from '@lucide/svelte/icons/copy';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import Download from '@lucide/svelte/icons/download';
	import Droplet from '@lucide/svelte/icons/droplet';
	import Dumbbell from '@lucide/svelte/icons/dumbbell';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import FileText from '@lucide/svelte/icons/file-text';
	import Flower from '@lucide/svelte/icons/flower';
	import Footprints from '@lucide/svelte/icons/footprints';
	import Glasses from '@lucide/svelte/icons/glasses';
	import Globe from '@lucide/svelte/icons/globe';
	import GraduationCap from '@lucide/svelte/icons/graduation-cap';
	import GripVertical from '@lucide/svelte/icons/grip-vertical';
	import Hand from '@lucide/svelte/icons/hand';
	import HandHeart from '@lucide/svelte/icons/hand-heart';
	import HeartPulse from '@lucide/svelte/icons/heart-pulse';
	import Hospital from '@lucide/svelte/icons/hospital';
	import House from '@lucide/svelte/icons/house';
	import ImageIcon from '@lucide/svelte/icons/image';
	import Info from '@lucide/svelte/icons/info';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import Languages from '@lucide/svelte/icons/languages';
	import Layers from '@lucide/svelte/icons/layers';
	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	import Leaf from '@lucide/svelte/icons/leaf';
	import LifeBuoy from '@lucide/svelte/icons/life-buoy';
	import List from '@lucide/svelte/icons/list';
	import Lock from '@lucide/svelte/icons/lock';
	import LogOut from '@lucide/svelte/icons/log-out';
	import Mail from '@lucide/svelte/icons/mail';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import Menu from '@lucide/svelte/icons/menu';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import Microscope from '@lucide/svelte/icons/microscope';
	import Monitor from '@lucide/svelte/icons/monitor';
	import Navigation from '@lucide/svelte/icons/navigation';
	import Newspaper from '@lucide/svelte/icons/newspaper';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Phone from '@lucide/svelte/icons/phone';
	import Pill from '@lucide/svelte/icons/pill';
	import Plus from '@lucide/svelte/icons/plus';
	import Quote from '@lucide/svelte/icons/quote';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import Scan from '@lucide/svelte/icons/scan';
	import ScanEye from '@lucide/svelte/icons/scan-eye';
	import ScanLine from '@lucide/svelte/icons/scan-line';
	import Search from '@lucide/svelte/icons/search';
	import Settings from '@lucide/svelte/icons/settings';
	import Shield from '@lucide/svelte/icons/shield';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import Siren from '@lucide/svelte/icons/siren';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Star from '@lucide/svelte/icons/star';
	import Stethoscope from '@lucide/svelte/icons/stethoscope';
	import Sun from '@lucide/svelte/icons/sun';
	import Syringe from '@lucide/svelte/icons/syringe';
	import ThumbsUp from '@lucide/svelte/icons/thumbs-up';
	import Trash from '@lucide/svelte/icons/trash-2';
	import Tv from '@lucide/svelte/icons/tv';
	import Upload from '@lucide/svelte/icons/upload';
	import UserRound from '@lucide/svelte/icons/user-round';
	import Users from '@lucide/svelte/icons/users';
	import Wallet from '@lucide/svelte/icons/wallet';
	import Webhook from '@lucide/svelte/icons/webhook';
	import Wifi from '@lucide/svelte/icons/wifi';
	import X from '@lucide/svelte/icons/x';
	import Zap from '@lucide/svelte/icons/zap';

	export const LUCIDE = {
		accessibility: Accessibility,
		activity: Activity,
		ambulance: Ambulance,
		armchair: Armchair,
		'arrow-left': ArrowLeft,
		'arrow-right': ArrowRight,
		award: Award,
		baby: Baby,
		'badge-check': BadgeCheck,
		bell: Bell,
		bone: Bone,
		'book-open': BookOpen,
		bot: Bot,
		brain: Brain,
		'briefcase-medical': BriefcaseMedical,
		calendar: Calendar,
		'calendar-check': CalendarCheck,
		car: Car,
		check: Check,
		'chevron-down': ChevronDown,
		'chevron-left': ChevronLeft,
		'chevron-right': ChevronRight,
		'clipboard-list': ClipboardList,
		clock: Clock,
		coffee: Coffee,
		copy: Copy,
		'credit-card': CreditCard,
		download: Download,
		droplet: Droplet,
		dumbbell: Dumbbell,
		'external-link': ExternalLink,
		eye: Eye,
		'eye-off': EyeOff,
		'file-text': FileText,
		flower: Flower,
		footprints: Footprints,
		glasses: Glasses,
		globe: Globe,
		'graduation-cap': GraduationCap,
		grip: GripVertical,
		hand: Hand,
		'hand-heart': HandHeart,
		'heart-pulse': HeartPulse,
		hospital: Hospital,
		house: House,
		image: ImageIcon,
		info: Info,
		key: KeyRound,
		languages: Languages,
		layers: Layers,
		dashboard: LayoutDashboard,
		leaf: Leaf,
		'life-buoy': LifeBuoy,
		list: List,
		lock: Lock,
		'log-out': LogOut,
		mail: Mail,
		'map-pin': MapPin,
		menu: Menu,
		'message-circle': MessageCircle,
		microscope: Microscope,
		monitor: Monitor,
		navigation: Navigation,
		newspaper: Newspaper,
		pencil: Pencil,
		phone: Phone,
		pill: Pill,
		plus: Plus,
		quote: Quote,
		refresh: RefreshCw,
		scan: Scan,
		'scan-eye': ScanEye,
		'scan-line': ScanLine,
		search: Search,
		settings: Settings,
		shield: Shield,
		'shield-check': ShieldCheck,
		siren: Siren,
		sparkles: Sparkles,
		star: Star,
		stethoscope: Stethoscope,
		sun: Sun,
		syringe: Syringe,
		'thumbs-up': ThumbsUp,
		trash: Trash,
		tv: Tv,
		upload: Upload,
		user: UserRound,
		users: Users,
		wallet: Wallet,
		webhook: Webhook,
		wifi: Wifi,
		x: X,
		zap: Zap
	} as const;

	/** Custom 24×24 stroke icons (lucide style) for things lucide does not ship. */
	export const CUSTOM: Record<string, string> = {
		tooth:
			'<path d="M7.5 3C5 3 3.5 5 3.5 7.5c0 2 .8 3.4 1.4 5 .7 1.9.8 4 1.3 6 .4 1.6 1 2.5 1.9 2.5 1.3 0 1.5-1.8 1.8-3.4.3-1.5.7-3.1 2.1-3.1s1.8 1.6 2.1 3.1c.3 1.6.5 3.4 1.8 3.4.9 0 1.5-.9 1.9-2.5.5-2 .6-4.1 1.3-6 .6-1.6 1.4-3 1.4-5C20.5 5 19 3 16.5 3c-1.9 0-2.9 1.2-4.5 1.2S9.4 3 7.5 3Z"/>',
		implant:
			'<path d="M7 3h10c0 3-2 5-5 5S7 6 7 3Z"/><path d="M9 10h6M9.5 13h5M10 16h4M10.5 19h3M12 8v14"/>',
		braces:
			'<rect x="3" y="8" width="5" height="8" rx="1.5"/><rect x="9.5" y="8" width="5" height="8" rx="1.5"/><rect x="16" y="8" width="5" height="8" rx="1.5"/><path d="M2 12h20"/>',
		facebook: '<path d="M15 3h-2.5A3.5 3.5 0 0 0 9 6.5V9H6.5v3.5H9V21h3.5v-8.5H15l.5-3.5h-3V7a1 1 0 0 1 1-1H15Z"/>',
		instagram:
			'<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor"/>',
		youtube:
			'<rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 5 3-5 3Z" fill="currentColor"/>',
		linkedin:
			'<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10.5V17M8 7.5v.01M12 17v-6.5M12 13.5c0-1.8 1-3 2.5-3s2.5 1 2.5 3V17"/>',
		x: '<path d="M4 4l16 16M20 4 4 20"/>',
		google:
			'<path d="M20.5 12.2c0-.6-.1-1.2-.2-1.7H12v3.3h4.8a4.2 4.2 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.6-3.9 2.6-6.5Z"/><path d="M12 21c2.4 0 4.5-.8 5.9-2.2L15 16.5c-.8.6-1.8.9-3 .9-2.3 0-4.3-1.6-5-3.7H4v2.3A9 9 0 0 0 12 21Z"/><path d="M7 13.7a5.4 5.4 0 0 1 0-3.4V8H4a9 9 0 0 0 0 8Z"/><path d="M12 6.6c1.3 0 2.5.5 3.4 1.3l2.6-2.6A9 9 0 0 0 4 8l3 2.3c.7-2.1 2.7-3.7 5-3.7Z"/>',
		whatsapp:
			'<path d="M3.5 20.5 5 16.3A8.5 8.5 0 1 1 8 19.2Z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.5-2-1-1 .7c-1-.4-2.3-1.7-2.7-2.7l.7-1-1-2Z"/>'
	};

	export type IconName = keyof typeof LUCIDE | keyof typeof CUSTOM | string;
	export const ICON_NAMES = [...Object.keys(CUSTOM), ...Object.keys(LUCIDE)].sort();
</script>

<script lang="ts">
	interface Props {
		name: IconName;
		size?: number;
		class?: string;
		strokeWidth?: number;
		label?: string;
	}
	let { name, size = 20, class: klass = '', strokeWidth = 1.75, label }: Props = $props();

	const Lucide = $derived(LUCIDE[name as keyof typeof LUCIDE]);
	const custom = $derived(CUSTOM[name]);
</script>

{#if custom}
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width={strokeWidth}
		stroke-linecap="round"
		stroke-linejoin="round"
		class={klass}
		aria-hidden={label ? undefined : 'true'}
		aria-label={label}
		role={label ? 'img' : undefined}
	>
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- static, trusted markup -->
		{@html custom}
	</svg>
{:else if Lucide}
	<Lucide {size} class={klass} {strokeWidth} aria-hidden={label ? undefined : 'true'} aria-label={label} />
{:else}
	<Sparkles {size} class={klass} {strokeWidth} aria-hidden="true" />
{/if}
