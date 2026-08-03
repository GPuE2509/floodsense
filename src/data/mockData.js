// =====================================================
// FloodSense Admin - Mock Data
// =====================================================

export const iotDevices = [
  { id: 'IOT-QU12-001', name: "Ninh Kieu Monitoring Station", location: "Ninh Kieu Wharf", district: "Ninh Kieu", type: 'water_level', status: 'active', battery: 87, signal: 95, lastReading: '14:39', waterLevel: 42, tempC: 31 },
  { id: 'IOT-HM-047', name: "Cai Rang Monitoring Station", location: "Cai Rang Floating Market", district: "Cai Rang", type: 'water_level', status: 'warning', battery: 23, signal: 72, lastReading: '14:35', waterLevel: 91, tempC: 30 },
  { id: 'IOT-BC-023', name: "Binh Thuy Monitoring Station", location: "Binh Thuy Canal", district: "Binh Thuy", type: 'rainfall', status: 'active', battery: 91, signal: 88, lastReading: '14:40', waterLevel: 18, tempC: 29 },
  { id: 'IOT-TD-012', name: "Phong Dien Monitoring Station", location: "Phong Dien Market", district: "Phong Dien", type: 'water_level', status: 'error', battery: 0, signal: 0, lastReading: '09:12', waterLevel: 0, tempC: 0 },
  { id: 'IOT-GV-089', name: "O Mon Monitoring Station", location: "National Route 91", district: "O Mon", type: 'combined', status: 'active', battery: 76, signal: 91, lastReading: '14:38', waterLevel: 55, tempC: 32 },
  { id: 'IOT-BT-034', name: "Thot Not Monitoring Station", location: "Thot Not Canal", district: "Thot Not", type: 'water_level', status: 'warning', battery: 45, signal: 61, lastReading: '14:30', waterLevel: 78, tempC: 31 },
  { id: 'IOT-QU7-056', name: "Co Do Monitoring Station", location: "Co Do Town", district: "Co Do", type: 'rainfall', status: 'active', battery: 98, signal: 99, lastReading: '14:40', waterLevel: 12, tempC: 30 },
  { id: 'IOT-QU1-003', name: "Vinh Thanh Monitoring Station", location: "Vinh Thanh Town", district: "Vinh Thanh", type: 'water_level', status: 'offline', battery: 12, signal: 0, lastReading: '11:23', waterLevel: 0, tempC: 0 },
];
export const mockDevices = iotDevices;

// =====================================================

// --- Flood trend data (last 12 hours) ---
export const floodTrendData = [
  { time: '03:00', level: 12, alerts: 2, sos: 0 },
  { time: '04:00', level: 18, alerts: 3, sos: 1 },
  { time: '05:00', level: 35, alerts: 8, sos: 2 },
  { time: '06:00', level: 62, alerts: 15, sos: 5 },
  { time: '07:00', level: 88, alerts: 22, sos: 8 },
  { time: '08:00', level: 110, alerts: 31, sos: 12 },
  { time: '09:00', level: 95, alerts: 28, sos: 9 },
  { time: '10:00', level: 78, alerts: 21, sos: 6 },
  { time: '11:00', level: 65, alerts: 16, sos: 4 },
  { time: '12:00', level: 52, alerts: 13, sos: 3 },
  { time: '13:00', level: 41, alerts: 10, sos: 2 },
  { time: '14:00', level: 34, alerts: 8, sos: 1 },
];

// --- IoT device status ---
export const iotStatusData = [
  { name: "Work", value: 248, color: '#22c55e' },
  { name: "Warning", value: 23, color: '#f97316' },
  { name: "Error", value: 12, color: '#ef4444' },
  { name: 'Offline', value: 7, color: '#475569' },
];

// --- User growth data ---
export const userGrowthData = [
  { month: 'T1', users: 1200, active: 980 },
  { month: 'T2', users: 1450, active: 1120 },
  { month: 'T3', users: 1680, active: 1310 },
  { month: 'T4', users: 1920, active: 1560 },
  { month: 'T5', users: 2340, active: 1890 },
  { month: 'T6', users: 2780, active: 2200 },
  { month: 'T7', users: 3120, active: 2540 },
  { month: 'T8', users: 3560, active: 2890 },
  { month: 'T9', users: 3980, active: 3210 },
  { month: 'T10', users: 4320, active: 3580 },
  { month: 'T11', users: 4780, active: 3920 },
  { month: 'T12', users: 5240, active: 4380 },
];

// --- SOS alerts feed ---
export const sosAlerts = [
  {
    id: 'SOS-001',
    type: 'SOS',
    severity: 'critical',
    location: "Ninh Kieu, Can Tho",
    coords: [10.034189, 105.781305],
    user: "Nguyen Van An",
    time: '14:32',
    message: "Water flooded the first floor, urgent assistance is needed",
    status: 'pending',
  },
  {
    id: 'SOS-002',
    type: 'FLOOD',
    severity: 'high',
    location: "Cai Rang, Can Tho",
    coords: [10.009189, 105.753305],
    user: "Tran Thi Binh",
    time: '14:28',
    message: "Nguyen Van Qua Street was flooded 80cm deep",
    status: 'processing',
  },
  {
    id: 'SOS-003',
    type: 'IOT',
    severity: 'medium',
    location: "Binh Thuy, Can Tho",
    coords: [10.071189, 105.723305],
    user: "IoT station #BC-047",
    time: '14:19',
    message: "The water level sensor exceeds the red threshold",
    status: 'resolved',
  },
  {
    id: 'SOS-004',
    type: 'SOS',
    severity: 'critical',
    location: "Phong Dien, Can Tho",
    coords: [10.042345, 105.771234],
    user: "Le Minh Chau",
    time: '14:15',
    message: "Traffic jam, water rising quickly on the road",
    status: 'pending',
  },
  {
    id: 'SOS-005',
    type: 'FLOOD',
    severity: 'high',
    location: "O Mon, Can Tho",
    coords: [10.021234, 105.761234],
    user: "Pham Quoc Dung",
    time: '14:08',
    message: "Nguyen Kiem street is heavily flooded",
    status: 'processing',
  },
];

// --- Community reports ---
export const communityReports = [
  {
    id: 'RPT-2024-0891',
    user: "Hoang Minh Tuan",
    avatar: 'HT',
    location: "Binh Thanh District, Ho Chi Minh City",
    description: "No Trang Long route was flooded about 50cm deep, motorbikes could not move. The water is continuing to rise.",
    imageCount: 3,
    aiScore: 94,
    aiVerdict: 'verified',
    severity: 'high',
    time: '14:38',
    status: 'pending',
  },
  {
    id: 'RPT-2024-0890',
    user: "Nguyen Thi Lan",
    avatar: 'NL',
    location: "District 7, Ho Chi Minh City",
    description: "Le Van Luong Street was slightly flooded, only about 10-15cm. Cars still drive normally.",
    imageCount: 1,
    aiScore: 87,
    aiVerdict: 'verified',
    severity: 'low',
    time: '14:25',
    status: 'approved',
  },
  {
    id: 'RPT-2024-0889',
    user: "Tran Van Hung",
    avatar: 'TH',
    location: "Tan Phu District, Ho Chi Minh City",
    description: "Tan Huong market was flooded, many merchants could not do business. Damaged goods.",
    imageCount: 5,
    aiScore: 91,
    aiVerdict: 'verified',
    severity: 'medium',
    time: '14:12',
    status: 'pending',
  },
  {
    id: 'RPT-2024-0888',
    user: "Le Thi Phuong",
    avatar: 'LP',
    location: "District 11, Ho Chi Minh City",
    description: "This area is not flooded much but the drainage system is not working well.",
    imageCount: 0,
    aiScore: 42,
    aiVerdict: 'uncertain',
    severity: 'low',
    time: '13:58',
    status: 'pending',
  },
  {
    id: 'RPT-2024-0887',
    user: "Vu Quoc Bao",
    avatar: 'VB',
    location: "Go Vap District, Ho Chi Minh City",
    description: "Spam test post with no useful information",
    imageCount: 0,
    aiScore: 8,
    aiVerdict: 'rejected',
    severity: 'none',
    time: '13:45',
    status: 'rejected',
  },
];

// --- Users ---
export const users = [
  { id: 'USR-001', name: "Nguyen Van An", email: 'nguyenvanan@gmail.com', phone: '0901234567', role: 'user', status: 'active', reports: 12, joined: '15/01/2024', lastSeen: "14:30 today", district: "District 12" },
  { id: 'USR-002', name: "Tran Thi Binh", email: 'tranthib@gmail.com', phone: '0912345678', role: 'user', status: 'active', reports: 8, joined: '22/02/2024', lastSeen: "13:45 today", district: "Hoc Mon" },
  { id: 'USR-003', name: "Le Minh Chau", email: 'leminchau@gmail.com', phone: '0923456789', role: 'moderator', status: 'active', reports: 45, joined: '05/03/2024', lastSeen: "14:15 today", district: "Thu Duc" },
  { id: 'USR-004', name: "Pham Quoc Dung", email: 'phamdung@gmail.com', phone: '0934567890', role: 'user', status: 'locked', reports: 3, joined: '18/03/2024', lastSeen: "3 days ago", district: "Go Vap" },
  { id: 'USR-005', name: "Hoang Minh Tuan", email: 'hoangtuan@gmail.com', phone: '0945678901', role: 'user', status: 'active', reports: 21, joined: '02/04/2024', lastSeen: "14:38 today", district: "Binh Thanh" },
  { id: 'USR-006', name: "Nguyen Thi Lan", email: 'nguyenlan@gmail.com', phone: '0956789012', role: 'user', status: 'active', reports: 7, joined: '10/04/2024', lastSeen: "14:25 today", district: "District 7" },
  { id: 'USR-007', name: "Vu Quoc Bao", email: 'vuquocbao@gmail.com', phone: '0967890123', role: 'user', status: 'locked', reports: 1, joined: '28/04/2024', lastSeen: "5 days ago", district: "District 11" },
  { id: 'USR-008', name: "Dinh Thi Hoa", email: 'dinhthihoa@gmail.com', phone: '0978901234', role: 'user', status: 'active', reports: 15, joined: '05/05/2024', lastSeen: "12:00 today", district: "Binh Chanh" },
];


// --- Forum posts ---
export const forumPosts = [
  {
    id: 'POST-001',
    title: "Nguyen Huu Canh Street is heavily flooded - need immediate warning",
    author: "Tran Van Hung",
    avatar: 'TH',
    category: "Urgent report",
    content: "Flooding is very serious at Nguyen Huu Canh street, Thu Thiem bridge area...",
    likes: 234,
    comments: 67,
    time: '13:45',
    status: 'pending',
    isPinned: false,
    hasViolation: false,
  },
  {
    id: 'POST-002',
    title: "[NOTICE] Instructions on how to escape when flooded",
    author: 'Admin FloodSense',
    avatar: 'AF',
    category: "Notification",
    content: "When experiencing flooding, people need to take the following steps...",
    likes: 1205,
    comments: 123,
    time: '10:00',
    status: 'approved',
    isPinned: true,
    hasViolation: false,
  },
  {
    id: 'POST-003',
    title: "Summary of frequent flooding points in Ho Chi Minh City",
    author: "Nguyen Thi Lan",
    avatar: 'NL',
    category: "Information",
    content: "List of 50 flood points regularly updated from IoT data...",
    likes: 892,
    comments: 89,
    time: '09:15',
    status: 'approved',
    isPinned: true,
    hasViolation: false,
  },
  {
    id: 'POST-004',
    title: "Content may violate community standards",
    author: "Anonymous user",
    avatar: '??',
    category: "Other",
    content: "Spam content, not related to flooding...",
    likes: 2,
    comments: 0,
    time: '08:30',
    status: 'pending',
    isPinned: false,
    hasViolation: true,
  },
  {
    id: 'POST-005',
    title: "Experience in flood protection for people's houses during the rainy season",
    author: "Le Minh Chau",
    avatar: 'LC',
    category: "Experience",
    content: "Sharing simple solutions to protect your home during the rainy season and flooding...",
    likes: 445,
    comments: 56,
    time: '08:00',
    status: 'pending',
    isPinned: false,
    hasViolation: false,
  },
];

// --- Support tickets ---
export const supportTickets = [
  { id: 'TKT-0234', user: "Hoang Van Minh", email: 'hoangvm@gmail.com', subject: "No warning message received", category: 'technical', priority: 'high', status: 'open', time: '14:10', message: "I turned on notifications but haven't received any flood warnings in the past 3 days..." },
  { id: 'TKT-0233', user: "Bui Thi Cuc", email: 'buithicuc@gmail.com', subject: "Account login error", category: 'account', priority: 'medium', status: 'open', time: '13:45', message: "I can't log in to my account, the system says the password is wrong but I'm sure it's correct..." },
  { id: 'TKT-0232', user: "Dang Quoc Hung", email: 'dangquochung@gmail.com', subject: "The map does not display the correct location", category: 'technical', priority: 'low', status: 'in_progress', time: '12:30', message: "The map on the app shows my location wrong, about 2km off..." },
  { id: 'TKT-0231', user: "Phan Thi Diep", email: 'phanthidiep@gmail.com', subject: "Request to export personal report data", category: 'data', priority: 'low', status: 'resolved', time: '11:15', message: "I want to export all the flood reports I've submitted in the last 6 months..." },
  { id: 'TKT-0230', user: "Ly Van Tai", email: 'lyvantai@gmail.com', subject: "Local IoT devices are not working", category: 'hardware', priority: 'high', status: 'open', time: '10:00', message: "The water level measuring station in my area has not updated data since early morning..." },
];

// --- System config ---
export const systemModules = [
  { id: 'mod-iot', name: "Real-time IoT monitoring", description: "Collect and process data from sensor stations", status: true, critical: true },
  { id: 'mod-alert', name: "Automatic warning system", description: "Automatically issue a warning when the flood threshold is exceeded", status: true, critical: true },
  { id: 'mod-ai', name: "AI Report Analysis", description: "Automatically moderate and classify reports from the community", status: true, critical: false },
  { id: 'mod-map', name: "Dynamic flood map", description: "Update heatmap and map overlay in real time", status: true, critical: false },
  { id: 'mod-forecast', name: "Weather forecast", description: "Integrate rain forecast data from NCHMF", status: true, critical: false },
  { id: 'mod-forum', name: "Community & Forum", description: "The community forum module shares flooded information", status: true, critical: false },
  { id: 'mod-notif', name: 'Push Notifications', description: "Send push notifications to user devices", status: true, critical: false },
  { id: 'mod-backup', name: "Automatic backup", description: "Store and backup system data periodically", status: false, critical: false },
];

// --- Map flood zones ---
export const floodZones = [
  { id: 1, lat: 10.034189, lng: 105.781305, intensity: 0.9, radius: 800, level: 'critical' },
  { id: 2, lat: 10.009189, lng: 105.753305, intensity: 0.7, radius: 600, level: 'high' },
  { id: 3, lat: 10.071189, lng: 105.723305, intensity: 0.6, radius: 500, level: 'high' },
  { id: 4, lat: 10.042345, lng: 105.771234, intensity: 0.8, radius: 700, level: 'critical' },
  { id: 5, lat: 10.021234, lng: 105.761234, intensity: 0.4, radius: 400, level: 'medium' },
  { id: 6, lat: 10.052345, lng: 105.743456, intensity: 0.3, radius: 300, level: 'low' },
];

// --- Broadcast advisories ---
export const broadcastAdvisories = [
  { id: 'ADV-001', title: "Warning of serious flooding in District 12", type: 'critical', sentAt: '14:00', reach: 12450, status: 'sent' },
  { id: 'ADV-002', title: "Avoid traveling through Nguyen Huu Canh street", type: 'warning', sentAt: '13:30', reach: 8230, status: 'sent' },
  { id: 'ADV-003', title: "Heavy rain is forecast this evening", type: 'info', sentAt: '12:00', reach: 24680, status: 'sent' },
];
