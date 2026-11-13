<script lang="ts" module>
	/**
	 * Icons are rendered from static SVG path data (lucide core, tree-shaken to this list)
	 * as plain markup — no component instance per icon — which keeps hydration cheap on
	 * pages with many icons.
	 */
	import {
		Accessibility, Activity, Ambulance, Armchair, ArrowLeft, ArrowRight, Award, Baby, BadgeCheck, Bell, Bone,
		BookOpen, Bot, Brain, BriefcaseMedical, Calendar, CalendarCheck, Car, Check, ChevronDown, ChevronLeft,
		ChevronRight, ClipboardList, Clock, Coffee, Copy, CreditCard, Download, Droplet, Dumbbell, ExternalLink, Eye,
		EyeOff, FileText, Flower, Footprints, Glasses, Globe, GraduationCap, GripVertical, Hand, HandHeart, HeartPulse,
		Hospital, House, Image, Info, KeyRound, Languages, Layers, LayoutDashboard, Leaf, LifeBuoy, List, Lock, LogOut,
		Mail, MapPin, Menu, MessageCircle, Microscope, Monitor, Navigation, Newspaper, Pencil, Phone, Pill, Plus, Quote,
		RefreshCw, Scan, ScanEye, ScanLine, Search, Settings, Shield, ShieldCheck, Siren, Sparkles, Star, Stethoscope,
		Sun, Syringe, ThumbsUp, Trash2, Tv, Upload, UserRound, Users, Wallet, Webhook, Wifi, X, Zap,
		type IconNode
	} from 'lucide';

	const NODES: Record<string, IconNode> = {
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
		image: Image,
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
		trash: Trash2,
		tv: Tv,
		upload: Upload,
		user: UserRound,
		users: Users,
		wallet: Wallet,
		webhook: Webhook,
		wifi: Wifi,
		x: X,
		zap: Zap
	};

	/** Custom 24×24 stroke icons (lucide style) for things lucide does not ship. */
	const CUSTOM: Record<string, string> = {
		tooth:
			'<path d="M7.5 3C5 3 3.5 5 3.5 7.5c0 2 .8 3.4 1.4 5 .7 1.9.8 4 1.3 6 .4 1.6 1 2.5 1.9 2.5 1.3 0 1.5-1.8 1.8-3.4.3-1.5.7-3.1 2.1-3.1s1.8 1.6 2.1 3.1c.3 1.6.5 3.4 1.8 3.4.9 0 1.5-.9 1.9-2.5.5-2 .6-4.1 1.3-6 .6-1.6 1.4-3 1.4-5C20.5 5 19 3 16.5 3c-1.9 0-2.9 1.2-4.5 1.2S9.4 3 7.5 3Z"/>',
		implant: '<path d="M7 3h10c0 3-2 5-5 5S7 6 7 3Z"/><path d="M9 10h6M9.5 13h5M10 16h4M10.5 19h3M12 8v14"/>',
		braces:
			'<rect x="3" y="8" width="5" height="8" rx="1.5"/><rect x="9.5" y="8" width="5" height="8" rx="1.5"/><rect x="16" y="8" width="5" height="8" rx="1.5"/><path d="M2 12h20"/>',
		// Social icons are one matching set: a rounded square frame with the glyph inside,
		// same stroke weight, so they read as the same colour and size side by side.
		facebook: '<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M15.5 7.5h-1.5A2.5 2.5 0 0 0 11.5 10v11M9 13h5.5"/>',
		instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor"/>',
		youtube: '<rect x="3" y="3" width="18" height="18" rx="5"/><path d="m10 8.5 5.5 3.5-5.5 3.5Z"/>',
		linkedin: '<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M8 10.5V16.5M8 7.5v.01M12 16.5v-6M12 13c0-1.6 1-2.5 2.3-2.5S16.5 11.4 16.5 13v3.5"/>',
		x: '<rect x="3" y="3" width="18" height="18" rx="5"/><path d="m8 8 8 8M16 8l-8 8"/>',
		google: '<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M16.5 12h-4.5M16.5 12a4.5 4.5 0 1 1-1.4-3.25"/>',
		whatsapp: '<path d="M3.5 20.5 5 16.3A8.5 8.5 0 1 1 8 19.2Z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.5-2-1-1 .7c-1-.4-2.3-1.7-2.7-2.7l.7-1-1-2Z"/>'
	};

	const markupCache = new Map<string, string>();
	function markup(name: string): string {
		let m = markupCache.get(name);
		if (m === undefined) {
			const node = NODES[name];
			m = node
				? node.map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${String(v)}"`).join(' ')}/>`).join('')
				: (CUSTOM[name] ?? '');
			markupCache.set(name, m);
		}
		return m;
	}

	export type IconName = string;
	export const ICON_NAMES = [...Object.keys(CUSTOM), ...Object.keys(NODES)].filter((v, i, a) => a.indexOf(v) === i).sort();
</script>

<script lang="ts">
	interface Props {
		name: IconName;
		size?: number;
		class?: string;
		strokeWidth?: number;
		/** Accessible name; without it the icon is decorative (aria-hidden). */
		label?: string;
	}
	let { name, size = 20, class: klass = '', strokeWidth = 1.75, label }: Props = $props();
	const inner = $derived(markup(name) || markup('sparkles'));
</script>

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
	class="shrink-0 {klass}"
	aria-hidden={label ? undefined : 'true'}
	aria-label={label}
	role={label ? 'img' : undefined}
	focusable="false"
	><!-- eslint-disable-next-line svelte/no-at-html-tags -- static, trusted icon data -->{@html inner}</svg
>
