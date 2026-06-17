export const userGrowth = [
  { month: "Jan", users: 1240, active: 820 },
  { month: "Feb", users: 1860, active: 1100 },
  { month: "Mar", users: 2540, active: 1480 },
  { month: "Apr", users: 3320, active: 2010 },
  { month: "May", users: 4180, active: 2640 },
  { month: "Jun", users: 5240, active: 3380 },
  { month: "Jul", users: 6510, active: 4220 },
  { month: "Aug", users: 7980, active: 5180 },
  { month: "Sep", users: 9540, active: 6320 },
  { month: "Oct", users: 11320, active: 7610 },
  { month: "Nov", users: 13180, active: 9020 },
  { month: "Dec", users: 15240, active: 10580 },
];

export const activityLevels = [
  { day: "Mon", messages: 4200, matches: 320 },
  { day: "Tue", messages: 3850, matches: 280 },
  { day: "Wed", messages: 4520, matches: 360 },
  { day: "Thu", messages: 5100, matches: 410 },
  { day: "Fri", messages: 6240, matches: 520 },
  { day: "Sat", messages: 7180, matches: 640 },
  { day: "Sun", messages: 6520, matches: 580 },
];

export const genderRatio = [
  { name: "Male", value: 58, fill: "var(--chart-1)" },
  { name: "Female", value: 42, fill: "var(--chart-2)" },
];

export const religiousPractice = [
  { name: "Highly Practicing", value: 38, fill: "var(--chart-1)" },
  { name: "Practicing", value: 32, fill: "var(--chart-2)" },
  { name: "Moderately", value: 22, fill: "var(--chart-3)" },
  { name: "Learning", value: 8, fill: "var(--chart-4)" },
];

export type MockUser = {
  id: string;
  name: string;
  email: string;
  age: number;
  gender: "Male" | "Female";
  country: string;
  city: string;
  practice: "Highly Practicing" | "Practicing" | "Moderately" | "Learning";
  madhab: "Hanafi" | "Maliki" | "Shafi'i" | "Hanbali" | "Other";
  status: "active" | "inactive" | "banned" | "pending";
  verified: boolean;
  premium: boolean;
  completeness: number;
  lastActive: string;
  joined: string;
};

const firstNames = [
  "Aisha", "Fatima", "Khadija", "Maryam", "Zainab", "Hafsa", "Sara", "Nour", "Layla", "Yasmin",
  "Ahmed", "Yusuf", "Ibrahim", "Omar", "Bilal", "Hamza", "Idris", "Khalid", "Zayd", "Mustafa",
];
const lastNames = ["Khan", "Ahmed", "Hassan", "Ali", "Rahman", "Siddiqui", "Iqbal", "Malik", "Qureshi", "Farooqi"];
const countries = [
  { country: "United Kingdom", city: "London" },
  { country: "United States", city: "New York" },
  { country: "Canada", city: "Toronto" },
  { country: "UAE", city: "Dubai" },
  { country: "Malaysia", city: "Kuala Lumpur" },
  { country: "Turkey", city: "Istanbul" },
  { country: "Pakistan", city: "Karachi" },
  { country: "Indonesia", city: "Jakarta" },
  { country: "Egypt", city: "Cairo" },
  { country: "Australia", city: "Sydney" },
];
const practices: MockUser["practice"][] = ["Highly Practicing", "Practicing", "Moderately", "Learning"];
const madhabs: MockUser["madhab"][] = ["Hanafi", "Maliki", "Shafi'i", "Hanbali", "Other"];
const statuses: MockUser["status"][] = ["active", "active", "active", "active", "inactive", "pending", "banned"];

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function generateUsers(count = 60): MockUser[] {
  const rand = seeded(42);
  return Array.from({ length: count }, (_, i) => {
    const gender = rand() > 0.5 ? "Female" : "Male";
    const first = firstNames[Math.floor(rand() * firstNames.length)];
    const last = lastNames[Math.floor(rand() * lastNames.length)];
    const loc = countries[Math.floor(rand() * countries.length)];
    return {
      id: `usr_${(1000 + i).toString(36)}`,
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.com`,
      age: 22 + Math.floor(rand() * 18),
      gender,
      country: loc.country,
      city: loc.city,
      practice: practices[Math.floor(rand() * practices.length)],
      madhab: madhabs[Math.floor(rand() * madhabs.length)],
      status: statuses[Math.floor(rand() * statuses.length)],
      verified: rand() > 0.45,
      premium: rand() > 0.7,
      completeness: 40 + Math.floor(rand() * 60),
      lastActive: `${Math.floor(rand() * 60) + 1}m ago`,
      joined: `2024-${String(Math.floor(rand() * 12) + 1).padStart(2, "0")}-${String(Math.floor(rand() * 27) + 1).padStart(2, "0")}`,
    };
  });
}

export const mockUsers = generateUsers(64);

export type Report = {
  id: string;
  reportedUser: string;
  reporter: string;
  category: "Harassment" | "Fake Profile" | "Inappropriate" | "Spam" | "Other";
  severity: "low" | "medium" | "high";
  status: "pending" | "reviewed" | "resolved";
  date: string;
};

export const mockReports: Report[] = [
  { id: "rpt_001", reportedUser: "Yusuf Khan", reporter: "Aisha Hassan", category: "Inappropriate", severity: "high", status: "pending", date: "2h ago" },
  { id: "rpt_002", reportedUser: "Omar Ali", reporter: "Fatima Iqbal", category: "Fake Profile", severity: "medium", status: "pending", date: "5h ago" },
  { id: "rpt_003", reportedUser: "Zayd Malik", reporter: "Maryam Khan", category: "Harassment", severity: "high", status: "reviewed", date: "1d ago" },
  { id: "rpt_004", reportedUser: "Bilal Qureshi", reporter: "Nour Ahmed", category: "Spam", severity: "low", status: "resolved", date: "2d ago" },
  { id: "rpt_005", reportedUser: "Hamza Siddiqui", reporter: "Layla Rahman", category: "Inappropriate", severity: "medium", status: "pending", date: "3d ago" },
  { id: "rpt_006", reportedUser: "Idris Farooqi", reporter: "Sara Hassan", category: "Harassment", severity: "high", status: "reviewed", date: "4d ago" },
];

export type Conversation = {
  id: string;
  participants: [string, string];
  participantIds?: [string, string];
  messageCount: number;
  flagged: boolean;
  flagReason?: string;
  lastMessage: string;
};

export const mockConversations: Conversation[] = [
  { id: "c1", participants: ["Aisha Hassan", "Yusuf Khan"], messageCount: 142, flagged: true, flagReason: "Inappropriate language", lastMessage: "5m ago" },
  { id: "c2", participants: ["Fatima Iqbal", "Ahmed Ali"], messageCount: 89, flagged: false, lastMessage: "12m ago" },
  { id: "c3", participants: ["Maryam Khan", "Ibrahim Hassan"], messageCount: 234, flagged: false, lastMessage: "1h ago" },
  { id: "c4", participants: ["Layla Rahman", "Khalid Malik"], messageCount: 56, flagged: true, flagReason: "Reported by user", lastMessage: "2h ago" },
  { id: "c5", participants: ["Nour Ahmed", "Bilal Siddiqui"], messageCount: 178, flagged: false, lastMessage: "3h ago" },
];

export type AuditLog = {
  id: string;
  admin: string;
  action: string;
  target: string;
  timestamp: string;
};

export const mockLogs: AuditLog[] = [
  { id: "l1", admin: "Admin Sarah", action: "Banned user", target: "Yusuf Khan (usr_a1b)", timestamp: "2 min ago" },
  { id: "l2", admin: "Mod Hassan", action: "Verified user", target: "Aisha Ahmed (usr_x2c)", timestamp: "18 min ago" },
  { id: "l3", admin: "Admin Sarah", action: "Resolved report", target: "rpt_004", timestamp: "1 hour ago" },
  { id: "l4", admin: "Support Layla", action: "Sent warning", target: "Omar Ali (usr_p9k)", timestamp: "2 hours ago" },
  { id: "l5", admin: "Admin Sarah", action: "Updated guidelines", target: "Community Rules v2.3", timestamp: "5 hours ago" },
  { id: "l6", admin: "Mod Hassan", action: "Deleted conversation", target: "conv_88a", timestamp: "1 day ago" },
];
