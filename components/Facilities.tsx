import React, { useState, useEffect } from "react";
import {
  getBuildings,
  saveBuilding,
  deleteBuilding,
  getRooms,
  saveRoom,
  deleteRoom,
  checkBuildingCodeExists,
  checkRoomNameExists,
  getStudents,
  getCourses,
} from "../services/storageService";
import {
  getSchedule,
  getExams,
  getDayLabel,
} from "../services/scheduleService";
import {
  Building,
  Room,
  RoomType,
  ClassSession,
  ExamSession,
  DayOfWeek,
  Permission,
} from "../types";
import {
  School,
  Landmark,
  Plus,
  Trash2,
  Edit2,
  X,
  Save,
  Search,
  MapPin,
  Users,
  Tv,
  Wind,
  Info,
  Filter,
  Calendar,
  Clock,
  AlertCircle,
  AlertTriangle,
  BookOpen,
  Monitor,
  MonitorPlay,
  TrendingUp,
  Sliders,
  Layers,
  Activity,
  Sparkles,
  Cpu,
} from "lucide-react";
import {
  notifySuccess,
  notifyError,
  notifyInfo,
} from "../services/notificationService";
import { logAction } from "../services/auditService";
import { getCurrentUser, hasPermission } from "../services/authService";
import { motion, AnimatePresence } from "motion/react";

import { Language } from "../services/i18nService";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface FacilitiesProps {
  language?: Language;
}

const Facilities: React.FC<FacilitiesProps> = ({ language = "ar" }) => {
  const [activeTab, setActiveTab] = useState<"buildings" | "rooms">(
    "buildings",
  );
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);

  const currentUser = getCurrentUser();
  const canManage = hasPermission(currentUser, Permission.FACILITIES_MANAGE);

  const [schedule, setSchedule] = useState<ClassSession[]>([]);
  const [exams, setExams] = useState<ExamSession[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>("all");

  // Modals
  const [showBuildingModal, setShowBuildingModal] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedRoomForSchedule, setSelectedRoomForSchedule] =
    useState<Room | null>(null);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [selectedRoomForConflict, setSelectedRoomForConflict] =
    useState<Room | null>(null);

  const [currentBuilding, setCurrentBuilding] = useState<Partial<Building>>({});
  const [currentRoom, setCurrentRoom] = useState<Partial<Room>>({
    type: "LECTURE_HALL",
    capacity: 30,
    hasProjector: false,
    hasAC: true,
    hasSmartBoard: false,
    hasPC: false,
    isAvailable: true,
  });

  // Heatmap & Floor Plan states
  const [heatmapBuildingId, setHeatmapBuildingId] = useState<string>("");
  const [selectedHeatmapRoom, setSelectedHeatmapRoom] = useState<Room | null>(
    null,
  );
  const [heatmapMode, setHeatmapMode] = useState<"weekly" | "hourly">("weekly");
  const [simulatedDay, setSimulatedDay] = useState<DayOfWeek>("MONDAY");
  const [simulatedHour, setSimulatedHour] = useState<number>(10);
  const [smartActives, setSmartActives] = useState<
    Record<string, { ac: boolean; proj: boolean }>
  >({});
  const [seatSimulationRatio, setSeatSimulationRatio] = useState<
    Record<string, number>
  >({});

  const getRoomFloor = (roomName: string, maxFloors: number = 3): number => {
    const numMatch = roomName.match(/\d+/);
    if (numMatch) {
      const num = parseInt(numMatch[0]);
      if (num >= 100) {
        const floor = Math.floor(num / 100);
        return Math.min(Math.max(floor, 1), maxFloors);
      }
      return Math.min(num, maxFloors);
    }
    let hash = 0;
    for (let i = 0; i < roomName.length; i++) {
      hash = roomName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.min(Math.abs(hash % maxFloors) + 1, maxFloors);
  };

  const isRoomOccupiedAt = (roomName: string, day: DayOfWeek, hour: number) => {
    const timeMinutes = hour * 60;

    const hasLecture = schedule.some((s) => {
      if (s.room !== roomName || s.day !== day) return false;
      const start = toMinutes(s.startTime);
      const end = toMinutes(s.endTime);
      return timeMinutes >= start && timeMinutes < end;
    });

    const hasExam = exams.some((e) => {
      if (e.room !== roomName) return false;
      if (getDayFromDate(e.date) !== day) return false;
      const start = toMinutes(e.startTime);
      const end = start + e.durationMinutes;
      return timeMinutes >= start && timeMinutes < end;
    });

    return hasLecture || hasExam;
  };

  const getRoomOccupancyRatio = (room: Room, isBusy: boolean) => {
    if (!room.isAvailable) return 0;
    if (!isBusy) return 0;
    if (seatSimulationRatio[room.id] !== undefined)
      return seatSimulationRatio[room.id];
    // Stable ratio between 0.3 and 0.85 based on room ID or name hash
    let hash = 0;
    const seedStr = room.id + room.name;
    for (let i = 0; i < seedStr.length; i++) {
      hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    const decimal = (Math.abs(hash) % 100) / 100;
    return 0.3 + decimal * 0.55; // between 30% and 85% occupancy
  };

  // Auto-initialize selected building ID for heatmap once buildings are loaded
  useEffect(() => {
    if (buildings.length > 0 && !heatmapBuildingId) {
      setHeatmapBuildingId(buildings[0].id);
    }
  }, [buildings, heatmapBuildingId]);

  // Track when heatmapBuildingId changes to auto-select the first room of that building
  useEffect(() => {
    if (heatmapBuildingId) {
      const bldRooms = rooms.filter((r) => r.buildingId === heatmapBuildingId);
      if (bldRooms.length > 0) {
        setSelectedHeatmapRoom(bldRooms[0]);
      } else {
        setSelectedHeatmapRoom(null);
      }
    }
  }, [heatmapBuildingId, rooms]);

  useEffect(() => {
    setBuildings(getBuildings());
    setRooms(getRooms());
    setSchedule(getSchedule());
    setExams(getExams());
  }, []);

  const handleSaveBuilding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;

    if (checkBuildingCodeExists(currentBuilding.code!, currentBuilding.id)) {
      notifyError("الرمز الكودي للمبنى موجود مسبقاً");
      return;
    }

    const bld: Building = {
      id: currentBuilding.id || `BLD-${Date.now()}`,
      name: currentBuilding.name!,
      code: currentBuilding.code!,
      floors: currentBuilding.floors || 1,
      description: currentBuilding.description,
    };
    saveBuilding(bld);
    setBuildings(getBuildings());
    setShowBuildingModal(false);
    notifySuccess("تم حفظ بيانات المبنى");
    logAction(
      "إدارة المباني",
      `تم ${currentBuilding.id ? "تعديل" : "إضافة"} مبنى: ${bld.name}`,
      "info",
    );
  };

  const handleSaveRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;

    if (
      checkRoomNameExists(
        currentRoom.buildingId!,
        currentRoom.name!,
        currentRoom.id,
      )
    ) {
      notifyError("اسم القاعة موجود مسبقاً في هذا المبنى");
      return;
    }

    if ((currentRoom.capacity || 0) <= 0) {
      notifyError("يجب أن تكون سعة القاعة رقماً موجباً");
      return;
    }

    const rm: Room = {
      id: currentRoom.id || `RM-${Date.now()}`,
      buildingId: currentRoom.buildingId!,
      name: currentRoom.name!,
      type: currentRoom.type as RoomType,
      capacity: currentRoom.capacity || 0,
      hasProjector: !!currentRoom.hasProjector,
      hasAC: !!currentRoom.hasAC,
      hasSmartBoard: !!currentRoom.hasSmartBoard,
      hasPC: !!currentRoom.hasPC,
      isAvailable:
        currentRoom.isAvailable !== undefined ? currentRoom.isAvailable : true,
    };
    saveRoom(rm);
    setRooms(getRooms());
    setShowRoomModal(false);
    notifySuccess("تم حفظ بيانات القاعة");
  };

  const roomTypeLabels: Record<RoomType, string> = {
    LECTURE_HALL: "مدرج / قاعة كبرى",
    LAB: "معمل متخصص",
    SEMINAR_ROOM: "قاعة سمنار",
    OFFICE: "مكتب إداري",
    EXAM_HALL: "لجنة امتحانات",
  };

  const filteredRooms = rooms.filter((r) => {
    const matchesSearch = r.name.includes(searchTerm);
    const matchesBuilding =
      selectedBuildingId === "all" || r.buildingId === selectedBuildingId;
    return matchesSearch && matchesBuilding;
  });

  const days: DayOfWeek[] = [
    "SATURDAY",
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
  ];
  const timeSlots = Array.from({ length: 13 }, (_, i) => i + 8); // 8:00 to 20:00

  const getTimelinePosition = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    const totalMinutes = (hours - 8) * 60 + minutes;
    const totalTimelineMinutes = 12 * 60; // 8:00 to 20:00
    return (totalMinutes / totalTimelineMinutes) * 100;
  };

  const getTimelineWidth = (startTime: string, endTime: string) => {
    const start = getTimelinePosition(startTime);
    const end = getTimelinePosition(endTime);
    return end - start;
  };

  const getTimelineWidthMinutes = (minutes: number) => {
    const totalTimelineMinutes = 12 * 60;
    return (minutes / totalTimelineMinutes) * 100;
  };

  const isCurrentRoomBusyAt = (
    roomName: string,
    day: DayOfWeek,
    time: number,
  ) => {
    const timeStr = `${time.toString().padStart(2, "0")}:00`;
    const timeMinutes = toMinutes(timeStr);

    return schedule.some((s) => {
      if (s.room !== roomName || s.day !== day) return false;
      const start = toMinutes(s.startTime);
      const end = toMinutes(s.endTime);
      return timeMinutes >= start && timeMinutes < end;
    });
  };

  const toMinutes = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };

  const getExamEndTime = (startTime: string, durationMinutes: number) => {
    const totalMinutes = toMinutes(startTime) + durationMinutes;
    const endH = Math.floor(totalMinutes / 60);
    const endM = totalMinutes % 60;
    return `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`;
  };

  const getDayFromDate = (dateStr: string): DayOfWeek | null => {
    const date = new Date(dateStr);
    const dayIdx = date.getDay(); // 0 is Sunday, 6 is Saturday
    const dayMap: Record<number, DayOfWeek> = {
      0: "SUNDAY",
      1: "MONDAY",
      2: "TUESDAY",
      3: "WEDNESDAY",
      4: "THURSDAY",
      6: "SATURDAY",
    };
    return dayMap[dayIdx] || null;
  };

  const calculateAvailability = (
    roomName: string,
    sessions: ClassSession[],
    roomExams: ExamSession[],
  ) => {
    const totalPossibleMinutes = days.length * (12 * 60); // 6 days * 12 hours
    let occupiedMinutes = 0;

    sessions.forEach((s) => {
      if (s.room === roomName) {
        occupiedMinutes += toMinutes(s.endTime) - toMinutes(s.startTime);
      }
    });

    roomExams.forEach((e) => {
      if (e.room === roomName) {
        occupiedMinutes += e.durationMinutes;
      }
    });

    const freeMinutes = Math.max(0, totalPossibleMinutes - occupiedMinutes);
    return Math.round((freeMinutes / totalPossibleMinutes) * 100);
  };

  const getRoomUtilizationData = (roomName: string) => {
    const totalPossibleMinutes = days.length * (12 * 60); // 6 days * 12 hours
    let occupiedMinutes = 0;

    schedule.forEach((s) => {
      if (s.room === roomName) {
        occupiedMinutes += toMinutes(s.endTime) - toMinutes(s.startTime);
      }
    });

    exams.forEach((e) => {
      if (e.room === roomName) {
        occupiedMinutes += e.durationMinutes;
      }
    });

    const freeMinutes = Math.max(0, totalPossibleMinutes - occupiedMinutes);
    return {
      usedHours: occupiedMinutes / 60,
      freeHours: freeMinutes / 60,
      totalHours: totalPossibleMinutes / 60,
      utilizationPercent: Math.min(
        100,
        Math.round((occupiedMinutes / totalPossibleMinutes) * 100),
      ),
    };
  };

  return (
    <div className="p-4 sm:p-5 pb-12">
      <div className="mb-5 flex justify-between items-center">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
            <School size={18} className="text-blue-600" />
            إدارة المنشآت والقاعات
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
            تجهيز البنية التحتية، المختبرات، والمدرجات
          </p>
        </div>
        <div className="flex gap-2">
          {canManage &&
            (activeTab === "buildings" ? (
              <button
                onClick={() => {
                  setCurrentBuilding({});
                  setShowBuildingModal(true);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow-sm transition-all"
              >
                <Plus size={20} />
                <span>مبنى جديد</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setCurrentRoom({
                    type: "LECTURE_HALL",
                    capacity: 30,
                    isAvailable: true,
                  });
                  setShowRoomModal(true);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow-sm transition-all"
              >
                <Plus size={20} />
                <span>قاعة جديدة</span>
              </button>
            ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-5 bg-white rounded-t-xl px-4 pt-3 gap-4">
        <button
          onClick={() => setActiveTab("buildings")}
          className={`pb-4 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === "buildings" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          <Landmark size={18} />
          المباني والمجمعات
        </button>
        <button
          onClick={() => setActiveTab("rooms")}
          className={`pb-4 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === "rooms" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          <MapPin size={18} />
          القاعات والمعامل
        </button>
      </div>

      {activeTab === "buildings" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-2">
          {buildings.map((b) => {
            const bldRooms = rooms.filter((r) => r.buildingId === b.id);
            return (
              <div
                key={b.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow group"
              >
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2.5">
                    <div className="bg-slate-50 p-2 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Landmark size={18} />
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {canManage && (
                        <>
                          <button
                            onClick={() => {
                              setCurrentBuilding(b);
                              setShowBuildingModal(true);
                            }}
                            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  "حذف المبنى سيحذف كافة القاعات المرتبطة به. هل أنت متأكد؟",
                                )
                              ) {
                                deleteBuilding(b.id);
                                setBuildings(getBuildings());
                                setRooms(getRooms());
                                notifyInfo("تم حذف المبنى");
                              }
                            }}
                            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-red-650"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">{b.name}</h3>
                  <p className="text-[9px] font-mono text-slate-400 mb-2">
                    {b.code}
                  </p>
                  <p className="text-[11px] text-slate-500 mb-2.5 line-clamp-2 min-h-[30px]">
                    {b.description || "لا يوجد وصف متاح"}
                  </p>
 
                  <div className="grid grid-cols-2 gap-2 border-t pt-2.5">
                    <div className="text-center border-l border-slate-150">
                      <p className="text-[10px] text-slate-400 mb-0.5">
                        إجمالي القاعات
                      </p>
                      <p className="text-base font-bold text-slate-700">
                        {bldRooms.length}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-slate-400 mb-0.5">
                        السعة الكلية
                      </p>
                      <p className="text-base font-bold text-slate-700">
                        {bldRooms.reduce((sum, r) => sum + r.capacity, 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "rooms" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex gap-4 items-center w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="بحث عن قاعة..."
                  className="w-full pr-10 pl-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={selectedBuildingId}
                onChange={(e) => setSelectedBuildingId(e.target.value)}
              >
                <option value="all">كافة المباني</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold text-slate-400 px-4">
              <div className="flex items-center gap-1">
                <Tv size={14} /> متوفر عرض
              </div>
              <div className="flex items-center gap-1">
                <Wind size={14} /> تكييف
              </div>
              <div className="flex items-center gap-1">
                <MonitorPlay size={14} /> سبورة ذكية
              </div>
              <div className="flex items-center gap-1">
                <Monitor size={14} /> أجهزة PC
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b">
                <tr>
                  <th className="px-4 py-2.5">اسم القاعة</th>
                  <th className="px-4 py-2.5">المبنى</th>
                  <th className="px-4 py-2.5">النوع</th>
                  <th className="px-4 py-2.5">السعة</th>
                  <th className="px-4 py-2.5">التجهيزات</th>
                  <th className="px-4 py-2.5 text-center">الحالة</th>
                  <th className="px-4 py-2.5">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRooms.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 group">
                    <td className="px-4 py-2.5 font-bold text-slate-800">
                      <button
                        onClick={() => {
                          setSelectedRoomForSchedule(r);
                          setShowScheduleModal(true);
                        }}
                        className="hover:text-blue-600 hover:underline flex items-center gap-2"
                      >
                        {r.name}
                        <Calendar size={12} className="text-slate-300" />
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {buildings.find((b) => b.id === r.buildingId)?.name ||
                        "---"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">
                        {roomTypeLabels[r.type]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono font-bold text-blue-600 flex items-center gap-1">
                      <Users size={14} className="text-slate-300" />
                      {r.capacity}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-2">
                        {r.hasProjector && (
                          <span title="مسلاط ضوئي">
                            <Tv size={16} className="text-green-500" />
                          </span>
                        )}
                        {r.hasAC && (
                          <span title="تكييف">
                            <Wind size={16} className="text-blue-500" />
                          </span>
                        )}
                        {r.hasSmartBoard && (
                          <span title="سبورة ضكية">
                            <MonitorPlay
                              size={16}
                              className="text-purple-500"
                            />
                          </span>
                        )}
                        {r.hasPC && (
                          <span title="أجهزة حاسوب">
                            <Monitor size={16} className="text-indigo-500" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.isAvailable ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}
                      >
                        {r.isAvailable ? "متاحة" : "صيانة"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setSelectedRoomForConflict(r);
                            setShowConflictModal(true);
                          }}
                          className="text-slate-400 hover:text-rose-600"
                          title={language === "ar" ? "تشخيص التعارض" : "Identify Conflict"}
                        >
                          <AlertTriangle size={16} />
                        </button>
                        {canManage && (
                          <>
                            <button
                              onClick={() => {
                                setCurrentRoom(r);
                                setShowRoomModal(true);
                              }}
                              className="text-slate-400 hover:text-blue-600"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm("حذف القاعة؟")) {
                                  deleteRoom(r.id);
                                  setRooms(getRooms());
                                  notifyInfo("تم حذف القاعة");
                                }
                              }}
                              className="text-slate-400 hover:text-red-600"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredRooms.length === 0 && (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center">
                <MapPin size={48} className="mb-4 opacity-20" />
                <p>لا توجد قاعات مطابقة للبحث</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Visual Floor Plan & Room Utilization Heatmap Section */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden min-h-[500px] mt-6 p-4 sm:p-5 shadow-sm flex flex-col justify-between">
        <div>
          {/* Top Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-5 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="bg-blue-100 text-blue-800 p-1 rounded-lg">
                  <Activity size={15} className="text-blue-600 animate-pulse" />
                </span>
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  {language === "ar"
                    ? "مخطط الطوابق التفاعلي والخريطة الحرارية للمنشآت"
                    : "Interactive Floor Plan & Facility Heatmap"}
                </h3>
              </div>
              <p className="text-[11px] text-slate-500">
                {language === "ar"
                  ? "متابعة حية لمعدلات استخدام الكثافة الاستيعابية وتوقيع الحضور الفعلي في القاعات"
                  : "Real-time monitoring of facility capacity utilization, space warmth and active attendance layout."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Building Selector */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-500">
                  {language === "ar" ? "المبنى:" : "Building:"}
                </label>
                <select
                  className="border rounded-xl px-3 py-2 text-sm font-bold text-slate-700 bg-slate-50 border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                  value={heatmapBuildingId}
                  onChange={(e) => setHeatmapBuildingId(e.target.value)}
                >
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Mode Toggles */}
              <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200/50">
                <button
                  onClick={() => setHeatmapMode("weekly")}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${heatmapMode === "weekly" ? "bg-white text-blue-600 shadow-sm font-black" : "text-slate-500 hover:text-slate-700 font-bold"}`}
                >
                  <Layers size={14} />
                  <span>
                    {language === "ar" ? "التراكمي الأسبوعي" : "Weekly Heat"}
                  </span>
                </button>
                <button
                  onClick={() => setHeatmapMode("hourly")}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${heatmapMode === "hourly" ? "bg-white text-blue-600 shadow-sm font-black" : "text-slate-500 hover:text-slate-700 font-bold"}`}
                >
                  <Clock size={14} />
                  <span>
                    {language === "ar"
                      ? "المحاكاة الساعية حياً"
                      : "Live Hourly"}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Sub-header Controls for Simulate Mode */}
          {heatmapMode === "hourly" && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 mb-5 grid grid-cols-1 md:grid-cols-3 gap-4 items-center"
            >
              {/* Day Selector */}
              <div className="space-y-1.5 font-sans">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">
                  {language === "ar"
                    ? "يوم المحاكاة المقترح"
                    : "Simulated Weekday"}
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      "SATURDAY",
                      "SUNDAY",
                      "MONDAY",
                      "TUESDAY",
                      "WEDNESDAY",
                      "THURSDAY",
                    ] as DayOfWeek[]
                  ).map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setSimulatedDay(day)}
                      className={`text-[9px] font-black py-1.5 rounded-lg border transition-all ${simulatedDay === day ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-white hover:bg-slate-100 text-slate-600 border-slate-200"}`}
                    >
                      {getDayLabel(day)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hour Slider */}
              <div className="md:col-span-2 space-y-1.5 font-sans">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    {language === "ar"
                      ? "جدول العرض المختار"
                      : "Timeline Simulation Hour"}
                  </label>
                  <span className="bg-blue-100 text-blue-800 text-[10px] px-2.5 py-0.5 rounded-full font-mono font-black">
                    {simulatedHour.toString().padStart(2, "0")}:00
                    {simulatedHour >= 12
                      ? language === "ar"
                        ? " مساءً"
                        : " PM"
                      : language === "ar"
                        ? " صباحاً"
                        : " AM"}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-bold text-slate-400">
                    08:00
                  </span>
                  <input
                    type="range"
                    min={8}
                    max={20}
                    step={1}
                    value={simulatedHour}
                    onChange={(e) => setSimulatedHour(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                  />
                  <span className="text-[10px] font-bold text-slate-400">
                    20:00
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Core Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left area: Floor Plan (lg:col-span-8) */}
            <div className="lg:col-span-8 space-y-4">
              {/* Color Range Indicator Legend */}
              <div className="flex flex-wrap items-center gap-4 bg-slate-50/50 border border-slate-200/40 rounded-xl p-3 text-xs leading-none">
                <span className="font-bold text-slate-500">
                  {language === "ar"
                    ? "مؤشر إشغال القاعات:"
                    : "Room Occupancy Level:"}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-emerald-500/10 border border-emerald-300"></span>
                  <span className="text-slate-600 text-[11px] font-bold">
                    {language === "ar" ? "إشغال منخفض (0-35%)" : "Low (0-35%)"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-amber-500/10 border border-amber-300"></span>
                  <span className="text-slate-600 text-[11px] font-bold">
                    {language === "ar"
                      ? "إشغال متوسط (35-75%)"
                      : "Medium (35-75%)"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-amber-500/10 border border-amber-300"></span>
                  <span className="hidden">
                    <style>{`
                                           /* empty */
                                       `}</style>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-rose-500/10 border border-rose-300 animate-pulse"></span>
                  <span className="text-slate-600 text-[11px] font-bold">
                    {language === "ar"
                      ? "إشغال مرتفع (75-100%)"
                      : "High (75-100%)"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-slate-100 border border-slate-300"></span>
                  <span className="text-slate-600 text-[11px] font-bold">
                    {language === "ar" ? "خارج الخدمة" : "Maintenance"}
                  </span>
                </div>
              </div>

              {/* Building Architectural Layout Container */}
              <div className="border border-slate-200 rounded-2xl bg-slate-950 p-4 md:p-5 relative overflow-hidden shadow-inner">
                {/* Blueprint Background Grid Effect */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                <div className="absolute top-4 right-6 text-[9px] font-mono font-bold text-white/20 tracking-widest uppercase">
                  {buildings.find((b) => b.id === heatmapBuildingId)?.code}{" "}
                  INTERACTIVE ARCHITECTURE Blueprints
                </div>

                {/* Floor row stack */}
                <div className="relative space-y-3.5 z-10 mt-4">
                  {(() => {
                    const currentBld = buildings.find(
                      (b) => b.id === heatmapBuildingId,
                    );
                    const bldRooms = rooms.filter(
                      (r) => r.buildingId === heatmapBuildingId,
                    );
                    const floorsCount = currentBld?.floors || 3;

                    // Create array of floors descending, e.g. [3, 2, 1]
                    const floors = Array.from(
                      { length: floorsCount },
                      (_, i) => floorsCount - i,
                    );

                    return floors.map((floorNum) => {
                      const floorRooms = bldRooms.filter(
                        (r) => getRoomFloor(r.name, floorsCount) === floorNum,
                      );

                      return (
                        <div
                          key={floorNum}
                          className="grid grid-cols-1 md:grid-cols-[70px_1fr] gap-3 items-center border border-white/5 bg-white/[0.015] rounded-xl p-3 backdrop-blur-sm"
                        >
                          {/* Floor Label Tag with lift visual representation */}
                          <div className="flex items-center md:flex-col justify-start md:justify-center border-b md:border-b-0 md:border-l border-white/10 pb-1.5 md:pb-0 gap-2 md:gap-0.5 text-right md:text-center">
                            <span className="text-[9px] font-mono uppercase text-white/40 tracking-widest">
                              {language === "ar" ? "الطابق" : "Floor"}
                            </span>
                            <span className="text-xl font-black text-white px-1.5 rounded bg-white/10 font-mono">
                              {floorNum.toString().padStart(2, "0")}
                            </span>
                          </div>

                          {/* Rooms grid inside floor map */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                            {floorRooms.map((room) => {
                              // Compute room heat parameters based on selected mode
                              let utilizationPercent = 0;
                              let isBusyNow = false;

                              if (heatmapMode === "weekly") {
                                const avail = calculateAvailability(
                                  room.name,
                                  schedule,
                                  exams,
                                );
                                utilizationPercent = 100 - avail;
                              } else {
                                isBusyNow = isRoomOccupiedAt(
                                  room.name,
                                  simulatedDay,
                                  simulatedHour,
                                );
                                utilizationPercent = isBusyNow
                                  ? Math.round(
                                      getRoomOccupancyRatio(room, true) * 100,
                                    )
                                  : 0;
                              }

                              // Determine style classes depending on heat rating
                              let bgStyle = "";
                              let textStyle = "";
                              let badgeText = "";

                              if (!room.isAvailable) {
                                bgStyle =
                                  "bg-white/5 border-white/10 hover:bg-white/10 opacity-60";
                                textStyle = "text-white/40";
                                badgeText =
                                  language === "ar" ? "صيانة" : "Maintenance";
                              } else if (utilizationPercent < 35) {
                                bgStyle =
                                  "bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/15";
                                textStyle = "text-emerald-400";
                                badgeText =
                                  language === "ar" ? "إشغال منخفض" : "Low";
                              } else if (
                                utilizationPercent >= 35 &&
                                utilizationPercent < 75
                              ) {
                                bgStyle =
                                  "bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/15";
                                textStyle = "text-amber-400";
                                badgeText =
                                  language === "ar" ? "إشغال متوسط" : "Medium";
                              } else if (false) {
                                bgStyle =
                                  "bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/15";
                                textStyle = "text-amber-400";
                                badgeText =
                                  language === "ar" ? "مزدحم" : "Active";
                              } else {
                                bgStyle =
                                  "bg-rose-500/10 border-rose-500/25 hover:bg-rose-500/15 animate-pulse";
                                textStyle = "text-rose-400";
                                badgeText =
                                  language === "ar" ? "إشغال مرتفع" : "High";
                              }

                              const isSelected =
                                selectedHeatmapRoom?.id === room.id;

                              return (
                                <motion.div
                                  key={room.id}
                                  whileHover={{ scale: 1.02, y: -2 }}
                                  onClick={() => setSelectedHeatmapRoom(room)}
                                  className={`room-availability-card relative cursor-pointer rounded-xl border p-2.5 sm:p-3 transition-all duration-200 ${bgStyle} ${
                                    isSelected
                                      ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-950 border-blue-400 scale-102 shadow-[0_0_20px_rgba(59,130,246,0.3)] shadow-blue-500/20"
                                      : "shadow-lg shadow-black/20"
                                  }`}
                                >
                                  {/* Room Type Icon Header */}
                                  <div className="flex justify-between items-start mb-1.5">
                                    <span
                                      className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full ${textStyle} bg-white/5 border border-white/5`}
                                    >
                                      {badgeText}
                                    </span>
                                    <div>
                                      {room.type === "LECTURE_HALL" && (
                                        <Tv
                                          size={12}
                                          className="text-white/30"
                                        />
                                      )}
                                      {room.type === "LAB" && (
                                        <Cpu
                                          size={12}
                                          className="text-white/30"
                                        />
                                      )}
                                      {room.type === "SEMINAR_ROOM" && (
                                        <Landmark
                                          size={12}
                                          className="text-white/30"
                                        />
                                      )}
                                      {room.type === "OFFICE" && (
                                        <Users
                                          size={12}
                                          className="text-white/30"
                                        />
                                      )}
                                      {room.type === "EXAM_HALL" && (
                                        <AlertCircle
                                          size={12}
                                          className="text-white/30"
                                        />
                                      )}
                                    </div>
                                  </div>

                                  {/* Room Name & Info */}
                                  <h4 className="font-extrabold text-xs text-white mb-0.5">
                                    {room.name}
                                  </h4>
                                  <div className="flex justify-between items-center text-[9px] text-white/50 font-medium">
                                    <span>
                                      {roomTypeLabels[room.type] || room.type}
                                    </span>
                                    <span className="flex items-center gap-0.5">
                                      <Users size={9} />
                                      {room.isAvailable && isBusyNow
                                        ? `${Math.round(room.capacity * (utilizationPercent / 100))} / ${room.capacity}`
                                        : `0 / ${room.capacity}`}
                                    </span>
                                  </div>

                                  {/* Calculated Heat percentage display */}
                                  <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-1.5">
                                    <span className="text-[8px] text-white/40 tracking-wider font-mono">
                                      {language === "ar"
                                        ? "نسبة الإشغال"
                                        : "OCCUPANCY"}
                                    </span>
                                    <span
                                      className={`text-xs font-black font-mono ${textStyle}`}
                                    >
                                      {utilizationPercent}%
                                    </span>
                                  </div>

                                  {/* Identify Conflict Button */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedRoomForConflict(room);
                                      setShowConflictModal(true);
                                    }}
                                    className="mt-2 w-full py-1 hover:py-1.5 transition-all text-[9px] font-bold uppercase text-center rounded bg-rose-500/10 text-rose-300 border border-rose-500/15 hover:bg-rose-500/20 flex items-center justify-center gap-1 shrink-0 z-10"
                                  >
                                    <AlertTriangle size={9} />
                                    {language === "ar" ? "تشخيص التعارض" : "Identify Conflict"}
                                  </button>
                                </motion.div>
                              );
                            })}

                            {floorRooms.length === 0 && (
                              <div className="col-span-full py-6 text-center text-white/20 text-xs italic">
                                {language === "ar"
                                  ? "لا توجد قاعات مسجلة في هذا الطابق بعد"
                                  : "No rooms registered on this floor yet."}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>

            {/* Right area: Room Inspector & seat layout (lg:col-span-4) */}
            <div className="lg:col-span-4">
              {selectedHeatmapRoom ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4 relative overflow-hidden shadow-xs"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-100/30 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                  {/* Room Details Title */}
                  <div className="relative flex justify-between items-start gap-3 flex-wrap">
                    <div>
                      <span className="bg-blue-100 text-blue-850 text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider inline-block mb-1">
                        {language === "ar"
                          ? "فاحص المنشأة الذكي"
                          : "SMART ROOM NODE"}
                      </span>
                      <h4 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                        {selectedHeatmapRoom.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        {roomTypeLabels[selectedHeatmapRoom.type]} •{" "}
                        {selectedHeatmapRoom.isAvailable
                          ? language === "ar"
                            ? "متصل وحي"
                            : "Live Node"
                          : language === "ar"
                            ? "قيد الصيانة"
                            : "Maintenance Mode"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRoomForConflict(selectedHeatmapRoom);
                        setShowConflictModal(true);
                      }}
                      className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100/80 text-rose-700 border border-rose-200 rounded-lg transition-all shadow-xs flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider"
                    >
                      <AlertTriangle size={12} className="text-rose-500" />
                      {language === "ar" ? "تشخيص التعارض" : "Identify Conflict"}
                    </button>
                  </div>

                  {/* Intelligent Dynamic Controls (simulating IoT parameters) */}
                  <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2.5">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      {language === "ar"
                        ? "لوحة تحكم البيئة والأجهزة الذكية"
                        : "IoT HVAC & Hardware Integration"}
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                      {/* AC trigger toggle */}
                      <button
                        type="button"
                        onClick={() => {
                          const bldKey = selectedHeatmapRoom.id;
                          const current = smartActives[bldKey] || {
                            ac: selectedHeatmapRoom.hasAC,
                            proj: selectedHeatmapRoom.hasProjector,
                          };
                          const updated = { ...current, ac: !current.ac };
                          setSmartActives({
                            ...smartActives,
                            [bldKey]: updated,
                          });
                          notifyInfo(
                            updated.ac
                              ? language === "ar"
                                ? "تم تشغيل التكييف آلياً"
                                : "Smart HVAC node engaged"
                              : language === "ar"
                                ? "تم إيقاف التكييف لترشيد الطاقة"
                                : "Smart HVAC node disengaged",
                          );
                        }}
                        className={`p-2 rounded-lg border font-bold text-[11px] flex flex-col items-center gap-1.5 transition-all text-center ${
                          (smartActives[selectedHeatmapRoom.id]?.ac ??
                          selectedHeatmapRoom.hasAC)
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <Wind size={14} />
                        <span>
                          {language === "ar" ? "التكييف الذكي" : "Smart AC"}
                        </span>
                        <span className="text-[9px] font-black">
                          {(smartActives[selectedHeatmapRoom.id]?.ac ??
                          selectedHeatmapRoom.hasAC)
                            ? language === "ar"
                              ? "نشط 22°C"
                              : "ACTIVE 22°C"
                            : language === "ar"
                              ? "مغلق"
                              : "OFF"}
                        </span>
                      </button>

                      {/* Projector trigger toggle */}
                      <button
                        type="button"
                        onClick={() => {
                          const bldKey = selectedHeatmapRoom.id;
                          const current = smartActives[bldKey] || {
                            ac: selectedHeatmapRoom.hasAC,
                            proj: selectedHeatmapRoom.hasProjector,
                          };
                          const updated = { ...current, proj: !current.proj };
                          setSmartActives({
                            ...smartActives,
                            [bldKey]: updated,
                          });
                          notifyInfo(
                            updated.proj
                              ? language === "ar"
                                ? "تم تنشيط مسلاط العرض في القاعة"
                                : "Digital Projector turned on"
                              : language === "ar"
                                ? "تم إطفاء مسلاط العرض"
                                : "Digital Projector shut down",
                          );
                        }}
                        className={`p-2 rounded-lg border font-bold text-[11px] flex flex-col items-center gap-1.5 transition-all text-center ${
                          (smartActives[selectedHeatmapRoom.id]?.proj ??
                          selectedHeatmapRoom.hasProjector)
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <Tv size={14} />
                        <span>
                          {language === "ar" ? "جهاز العرض" : "Projector"}
                        </span>
                        <span className="text-[9px] font-black">
                          {(smartActives[selectedHeatmapRoom.id]?.proj ??
                          selectedHeatmapRoom.hasProjector)
                            ? language === "ar"
                              ? "متصل وبث"
                              : "CONNECTED"
                            : language === "ar"
                              ? "مغلق"
                              : "STANDBY"}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Interactive Seat Chart Heatmap representation (Bento seat grid) */}
                  <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {language === "ar"
                            ? "الرسم البياني لتوزيع الحضور والمقاعد"
                            : "Live Seating Topography"}
                        </p>
                        <p className="text-xs font-bold text-slate-600 mt-0.5">
                          {language === "ar"
                            ? "توزع الحضور الفعلي في الغرفة"
                            : "Spatial distribution map of students"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const ratio = Math.random() * 0.7 + 0.15;
                          setSeatSimulationRatio({
                            ...seatSimulationRatio,
                            [selectedHeatmapRoom.id]: ratio,
                          });
                          notifySuccess(
                            language === "ar"
                              ? "تم تحديث محاكاة المقاعد عشوائياً"
                              : "Seating structure re-grouped successfully!",
                          );
                        }}
                        className="text-[9px] font-black tracking-widest bg-slate-100 hover:bg-slate-200 text-slate-650 px-2 py-1 rounded"
                      >
                        SHUFFLE
                      </button>
                    </div>

                    {/* Mini seat grid blocks */}
                    <div className="border border-slate-100 bg-slate-50 p-4 rounded-xl">
                      {/* Visual Screen Indicator */}
                      <div className="w-2/3 h-2 bg-slate-300 rounded mx-auto mb-6 text-[8px] font-black text-slate-555 flex items-center justify-center uppercase tracking-widest font-mono">
                        {language === "ar"
                          ? "منصة الإلقاء / السبورة"
                          : "LECTURER SCREEN / PODIUM"}
                      </div>

                      {/* Seat array */}
                      {(() => {
                        const cap = selectedHeatmapRoom.capacity;
                        const seatsCount = Math.min(cap, 24);
                        const filledRatio =
                          seatSimulationRatio[selectedHeatmapRoom.id] ?? 0.45;
                        const filledCount = Math.round(
                          seatsCount * filledRatio,
                        );

                        const arabicNames = [
                          "خالد الفرجاني",
                          "أحمد كنو",
                          "رحمة الورفلي",
                          "سارة المصراتي",
                          "علي الزنتاني",
                          "مريم التريكي",
                          "محمد الباروني",
                          "حاتم الخمس",
                          "طه الزاوي",
                          "نوران الترهوني",
                          "أسامة السويسي",
                          "هدى الصادق",
                        ];
                        const englishNames = [
                          "Khalid F.",
                          "Ahmed K.",
                          "Rahma W.",
                          "Sarah M.",
                          "Ali Z.",
                          "Mariam T.",
                          "Mohamed B.",
                          "Hatem K.",
                          "Taha Z.",
                          "Nouran T.",
                          "Osama S.",
                          "Huda S.",
                        ];

                        return (
                          <div className="grid grid-cols-6 gap-2 max-w-[200px] mx-auto">
                            {Array.from({ length: seatsCount }).map(
                              (_, seatIdx) => {
                                const isFilled = seatIdx < filledCount;
                                const name =
                                  language === "ar"
                                    ? arabicNames[seatIdx % arabicNames.length]
                                    : englishNames[
                                        seatIdx % englishNames.length
                                      ];

                                return (
                                  <div
                                    key={seatIdx}
                                    title={
                                      isFilled
                                        ? `${language === "ar" ? "مشغول بواسطة:" : "Occupied by:"} ${name}`
                                        : language === "ar"
                                          ? "مقعد شاغر"
                                          : "Empty seat"
                                    }
                                    className={`aspect-square w-6 rounded-md flex items-center justify-center text-[8px] font-bold text-white transition-all transform hover:scale-125 cursor-help ${
                                      isFilled
                                        ? "bg-rose-500 shadow-xs shadow-rose-300"
                                        : "bg-emerald-500/10 border border-emerald-400/50 text-emerald-600"
                                    }`}
                                  >
                                    {seatIdx + 1}
                                  </div>
                                );
                              },
                            )}
                          </div>
                        );
                      })()}

                      {/* Legend info */}
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold mt-4 pt-4 border-t border-slate-200">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-rose-500 rounded-sm"></span>{" "}
                          {language === "ar" ? "مشغول" : "Occupied"}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-emerald-500/20 border border-emerald-400 rounded-sm"></span>{" "}
                          {language === "ar" ? "متاح" : "Free"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bookings / Schedule Summary for selected room */}
                  <div className="space-y-3">
                    <h5 className="text-[11px] font-extrabold text-slate-400 tracking-wider uppercase">
                      {language === "ar"
                        ? "الحجوزات المقررة اليوم (محاكاة)"
                        : "Scheduled Bookings (Simulated Day)"}
                    </h5>

                    <div className="space-y-2">
                      {(() => {
                        const bookedToday = schedule.filter(
                          (s) =>
                            s.room === selectedHeatmapRoom.name &&
                            s.day === simulatedDay,
                        );

                        if (bookedToday.length > 0) {
                          return bookedToday.map((booking, bIdx) => (
                            <div
                              key={bIdx}
                              className="bg-white border rounded-xl p-3 flex justify-between items-center shadow-xs"
                            >
                              <div>
                                <p className="font-extrabold text-xs text-slate-800">
                                  {booking.courseName}
                                </p>
                                <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                  <Clock size={10} />
                                  {booking.startTime} - {booking.endTime}
                                </p>
                              </div>
                              <span className="bg-blue-50 text-blue-700 text-[9px] px-2 py-0.5 rounded-full font-black uppercase">
                                {language === "ar" ? "محاضرة" : "LECTURE"}
                              </span>
                            </div>
                          ));
                        } else {
                          return (
                            <div className="text-center py-4 bg-white rounded-xl border border-dashed border-slate-205 text-slate-400 text-[10px] font-bold italic">
                              {language === "ar"
                                ? "القاعة متاحة وشاغرة بالكامل اليوم"
                                : "No reservations scheduled today"}
                            </div>
                          );
                        }
                      })()}
                    </div>
                  </div>

                  {/* Room Utilization & Space Planning Statistics Chart Section */}
                  <div className="border-t border-slate-200/60 pt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="text-[11px] font-extrabold text-slate-500 tracking-wider uppercase flex items-center gap-1.5">
                          <TrendingUp size={12} className="text-blue-500" />
                          {language === "ar"
                            ? "تحليل تشغيل وتخطيط المساحة"
                            : "Space Planning & Utilization"}
                        </h5>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                          {language === "ar"
                            ? "ساعات الاستخدام المقارنة"
                            : "Hours used vs. available hours"}
                        </p>
                      </div>
                      {(() => {
                        const stats = getRoomUtilizationData(
                          selectedHeatmapRoom.name,
                        );
                        let badgeBg =
                          "bg-emerald-50 text-emerald-700 border-emerald-100";
                        let badgeLabel =
                          language === "ar" ? "استخدام متوازن" : "Optimal Use";
                        if (stats.utilizationPercent < 15) {
                          badgeBg = "bg-blue-50 text-blue-700 border-blue-100";
                          badgeLabel =
                            language === "ar" ? "تشغيل منخفض" : "Underutilized";
                        } else if (stats.utilizationPercent > 50) {
                          badgeBg = "bg-rose-50 text-rose-700 border-rose-100";
                          badgeLabel =
                            language === "ar" ? "تشغيل مكثف" : "Heavily Loaded";
                        }
                        return (
                          <span
                            className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border ${badgeBg}`}
                          >
                            {badgeLabel}
                          </span>
                        );
                      })()}
                    </div>

                    {(() => {
                      const stats = getRoomUtilizationData(
                        selectedHeatmapRoom.name,
                      );
                      const chartData = [
                        {
                          name: language === "ar" ? "مستغل" : "Hours Used",
                          value: parseFloat(stats.usedHours.toFixed(1)),
                          color: "#3b82f6",
                        },
                        {
                          name: language === "ar" ? "شاغر" : "Available",
                          value: parseFloat(stats.freeHours.toFixed(1)),
                          color: "#10b981",
                        },
                      ];

                      return (
                        <div className="space-y-4">
                          {/* Pie / Donut Chart */}
                          <div className="relative h-[180px] w-full bg-white rounded-2xl border border-slate-100 p-2 shadow-xs flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={chartData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={50}
                                  outerRadius={70}
                                  paddingAngle={2}
                                  dataKey="value"
                                >
                                  {chartData.map((entry, index) => (
                                    <Cell
                                      key={`cell-${index}`}
                                      fill={entry.color}
                                    />
                                  ))}
                                </Pie>
                                <Tooltip
                                  contentStyle={{
                                    fontSize: "10px",
                                    fontWeight: "bold",
                                    borderRadius: "12px",
                                    border: "1px solid #e2e8f0",
                                    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                                  }}
                                  formatter={(value: any) => [
                                    `${value} ${language === "ar" ? "ساعة" : "Hrs"}`,
                                    "",
                                  ]}
                                />
                              </PieChart>
                            </ResponsiveContainer>

                            {/* Center percentage indicator */}
                            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none">
                              <span className="text-xl font-black text-slate-750 font-mono leading-none">
                                {stats.utilizationPercent}%
                              </span>
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                {language === "ar"
                                  ? "معدل الإشغال"
                                  : "UTILIZATION"}
                              </span>
                            </div>
                          </div>

                          {/* Stat breakdown rows */}
                          <div className="grid grid-cols-3 gap-2.5 text-center font-sans">
                            <div className="bg-white border border-slate-200/60 p-2.5 rounded-xl">
                              <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">
                                {language === "ar"
                                  ? "الإجمالي القابل للملء"
                                  : "Total Hours"}
                              </span>
                              <span className="text-xs font-extrabold text-slate-705 font-mono">
                                {stats.totalHours.toFixed(0)}h
                              </span>
                            </div>
                            <div className="bg-blue-50/30 border border-blue-100 p-2.5 rounded-xl">
                              <span className="block text-[8px] font-black text-blue-400 uppercase tracking-wider">
                                {language === "ar"
                                  ? "ساعات النشاط"
                                  : "Hours Used"}
                              </span>
                              <span className="text-xs font-black text-blue-600 font-mono">
                                {stats.usedHours.toFixed(1)}h
                              </span>
                            </div>
                            <div className="bg-emerald-50/30 border border-emerald-100 p-2.5 rounded-xl">
                              <span className="block text-[8px] font-black text-emerald-400 uppercase tracking-wider">
                                {language === "ar"
                                  ? "ساعات الشغور"
                                  : "Hours Free"}
                              </span>
                              <span className="text-xs font-black text-emerald-600 font-mono">
                                {stats.freeHours.toFixed(1)}h
                              </span>
                            </div>
                          </div>

                          {/* Advanced planning tip context */}
                          <div className="bg-slate-100/50 border border-slate-200/50 rounded-xl p-3 flex items-start gap-2.5">
                            <Info
                              size={14}
                              className="text-indigo-500 shrink-0 mt-0.5"
                            />
                            <p
                              className="text-[10px] text-slate-500 leading-relaxed text-right"
                              dir="rtl"
                            >
                              {language === "ar"
                                ? `قاعات ${selectedHeatmapRoom.type === "LAB" ? "المعامل" : "المدرجات"} ذات السعة [${selectedHeatmapRoom.capacity}] مقعداً تحقق الكفاءة الإقصى عند جدولة الحصص بين ٢٠ و ٤٥ ساعة أسبوعياً لتلافي تكدس الممرات والمجموعات.`
                                : `This ${selectedHeatmapRoom.type === "LAB" ? "laboratory" : "lecture hall"} works at optimal space efficiency of 20-45 hours per cycle; values beyond 50 hours suggest potential scheduling overlaps.`}
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </motion.div>
              ) : (
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-12 text-center text-slate-400 space-y-3">
                  <Sparkles
                    size={32}
                    className="mx-auto text-slate-300 animate-pulse"
                  />
                  <p className="text-xs font-bold uppercase tracking-wider">
                    {language === "ar"
                      ? "يرجى تحديد قاعة لتفقد بياناتها"
                      : "Select a Room to inspect"}
                  </p>
                  <p className="text-[10px] max-w-xs mx-auto text-slate-400">
                    {language === "ar"
                      ? "انقر على أي قاعة في مخطط الطابق المقابل لتفقد المعدات وتوزيع المقاعد والجدول الزمني."
                      : "Click any room in the floor layout to load interactive seating maps, IoT statuses, and schedules."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Room Schedule Modal with Visual Timeline */}
      <AnimatePresence>
        {showScheduleModal && selectedRoomForSchedule && (
          <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]"
            >
              <div className="bg-slate-900 text-white p-4 sm:p-5 flex justify-between items-center relative overflow-hidden shrink-0">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10 flex gap-4 items-center">
                  <div className="bg-blue-600 p-2.5 rounded-xl shadow-xl shadow-blue-500/10">
                    <Clock size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold flex items-center gap-3">
                      مخطط إشغال القاعة: {selectedRoomForSchedule.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                      <Landmark size={14} />
                      {
                        buildings.find(
                          (b) => b.id === selectedRoomForSchedule.buildingId,
                        )?.name
                      }
                      <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                      {roomTypeLabels[selectedRoomForSchedule.type]}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-8 relative z-10 mr-auto ml-12">
                  <div className="text-left">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      نسبة التوفر
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="text-xl sm:text-2xl font-bold text-emerald-400">
                        {calculateAvailability(
                          selectedRoomForSchedule.name,
                          schedule,
                          exams,
                        )}
                        %
                      </div>
                      <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                        <div
                          className="h-full bg-emerald-500 shadow-sm shadow-emerald-500/50"
                          style={{
                            width: `${calculateAvailability(selectedRoomForSchedule.name, schedule, exams)}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowScheduleModal(false)}
                    className="text-slate-400 hover:text-white p-3 rounded-2xl hover:bg-white/10 transition-colors"
                  >
                    <X size={32} />
                  </button>
                </div>
              </div>

              <div className="p-5 overflow-y-auto no-scrollbar">
                <div className="flex gap-10 mb-8 items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-blue-500 rounded-md shadow-sm shadow-blue-200"></div>
                    <span className="text-sm font-bold text-slate-600">
                      محاضرات أسبوعية
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-amber-500 rounded-md shadow-sm shadow-amber-200"></div>
                    <span className="text-sm font-bold text-slate-600">
                      امتحانات مجدولة
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-slate-100 border border-slate-200 rounded-md"></div>
                    <span className="text-sm font-bold text-slate-600">
                      وقت متاح
                    </span>
                  </div>
                  <div className="flex-1"></div>
                  <div className="flex items-center gap-2 text-xs font-black text-slate-400 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                    <Info size={14} className="text-blue-500" />
                    المخطط يشمل كافة المحاضرات الأسبوعية والامتحانات المجدولة في
                    القاعة
                  </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm relative">
                  {/* Time Labels Header */}
                  <div className="grid grid-cols-[120px_1fr] bg-slate-50 border-b border-slate-100">
                    <div className="p-5 border-l border-slate-100 flex items-center justify-center font-black text-xs text-slate-400 uppercase tracking-widest">
                      اليوم
                    </div>
                    <div className="relative h-14 flex items-center px-4">
                      {timeSlots.map((time) => (
                        <div
                          key={time}
                          className="absolute text-[10px] font-black text-slate-400"
                          style={{
                            left: `${getTimelinePosition(`${time}:00`)}%`,
                          }}
                        >
                          {time.toString().padStart(2, "0")}:00
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Schedule Grid */}
                  <div className="divide-y divide-slate-50">
                    {days.map((day) => {
                      const daySessions = schedule.filter(
                        (s) =>
                          s.day === day &&
                          s.room === selectedRoomForSchedule.name,
                      );
                      // Filter exams that fall on this specific day of the week
                      const dayExams = exams.filter((e) => {
                        if (e.room !== selectedRoomForSchedule.name)
                          return false;
                        return getDayFromDate(e.date) === day;
                      });

                      return (
                        <div
                          key={day}
                          className="grid grid-cols-[120px_1fr] hover:bg-slate-50/50 transition-colors"
                        >
                          <div className="p-6 border-l border-slate-50 font-black text-sm text-slate-600 flex items-center justify-center bg-slate-50/30">
                            {getDayLabel(day)}
                          </div>
                          <div className="relative h-24 px-4 group">
                            {/* Vertical Grid Lines */}
                            {timeSlots.map((time) => (
                              <div
                                key={time}
                                className="absolute top-0 bottom-0 w-px bg-slate-100/50"
                                style={{
                                  left: `${getTimelinePosition(`${time}:00`)}%`,
                                }}
                              ></div>
                            ))}

                            {/* Lecture Blocks */}
                            {daySessions.map((s) => (
                              <motion.div
                                key={s.id}
                                whileHover={{ scaleY: 1.05, zIndex: 10 }}
                                className="absolute top-2 bottom-2 bg-blue-500 rounded-xl shadow-lg shadow-blue-200/50 border border-blue-400 p-3 overflow-hidden group/session cursor-default"
                                style={{
                                  left: `${getTimelinePosition(s.startTime)}%`,
                                  width: `${getTimelineWidth(s.startTime, s.endTime)}%`,
                                }}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <p className="text-[10px] font-black text-white truncate max-w-[80%]">
                                    {s.courseName}
                                  </p>
                                  <BookOpen
                                    size={10}
                                    className="text-blue-100 opacity-60"
                                  />
                                </div>
                                <div className="flex items-center gap-1 text-[9px] text-blue-100 font-bold opacity-80">
                                  <Clock size={8} />
                                  {s.startTime} - {s.endTime}
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover/session:opacity-100 transition-opacity"></div>
                              </motion.div>
                            ))}

                            {/* Exam Blocks */}
                            {dayExams.map((e) => {
                              const endTime = getExamEndTime(
                                e.startTime,
                                e.durationMinutes,
                              );
                              return (
                                <motion.div
                                  key={e.id}
                                  whileHover={{ scaleY: 1.05, zIndex: 10 }}
                                  className="absolute top-2 bottom-2 bg-amber-500 rounded-xl shadow-lg shadow-amber-200/50 border border-amber-400 p-3 overflow-hidden group/session cursor-default"
                                  style={{
                                    left: `${getTimelinePosition(e.startTime)}%`,
                                    width: `${getTimelineWidth(e.startTime, endTime)}%`,
                                  }}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <p className="text-[10px] font-black text-white truncate max-w-[80%]">
                                      امتحان: {e.courseName}
                                    </p>
                                    <AlertCircle
                                      size={10}
                                      className="text-amber-100 opacity-60"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1 text-[9px] text-amber-100 font-bold opacity-80">
                                    <Clock size={8} />
                                    {e.startTime} ({e.durationMinutes} د)
                                  </div>
                                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover/session:opacity-100 transition-opacity"></div>
                                </motion.div>
                              );
                            })}

                            {/* Empty Slot Labeling */}
                            {daySessions.length === 0 &&
                              dayExams.length === 0 && (
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 shadow-sm">
                                    متاح بالكامل
                                  </span>
                                </div>
                              )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Upcoming Exams Section */}
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                      <AlertCircle size={18} className="text-amber-500" />
                      الامتحانات القادمة في هذه القاعة
                    </h4>
                    <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-widest">
                      {
                        exams.filter(
                          (e) => e.room === selectedRoomForSchedule.name,
                        ).length
                      }{" "}
                      امتحان مجدول
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {exams
                      .filter((e) => e.room === selectedRoomForSchedule.name)
                      .map((exam) => (
                        <div
                          key={exam.id}
                          className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className="bg-amber-500 p-2 rounded-xl text-white shadow-lg shadow-amber-200">
                              <Calendar size={18} />
                            </div>
                            <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-sm font-mono">
                              {exam.date}
                            </span>
                          </div>
                          <h5 className="font-black text-slate-800 text-sm mb-1">
                            {exam.courseName}
                          </h5>
                          <div className="space-y-2 mt-4">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                              <Clock size={14} className="text-amber-400" />
                              {exam.startTime}
                              <span className="mx-1 opacity-40">|</span>
                              مدة {exam.durationMinutes} دقيقة
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                              <Users size={14} className="text-amber-400" />
                              {exam.invigilators.join("، ")}
                            </div>
                          </div>
                        </div>
                      ))}
                    {exams.filter(
                      (e) => e.room === selectedRoomForSchedule.name,
                    ).length === 0 && (
                      <div className="col-span-full py-12 border-2 border-dashed border-slate-100 rounded-[2rem] flex flex-col items-center justify-center text-slate-300">
                        <Calendar size={32} className="mb-2 opacity-50" />
                        <p className="text-xs font-bold italic">
                          لا توجد امتحانات مجدولة حالياً
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-5 bg-slate-50 border-t border-slate-100 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <Info size={16} className="text-blue-500" />
                  <p className="text-xs text-slate-500 font-medium max-w-lg leading-relaxed">
                    هذا المخطط يظهر كافة الحجوزات الأسبوعية والامتحانات المجدولة
                    في القاعة المختارة. يرجى التواصل مع إدارة التسجيل لتعديل أي
                    مواعيد.
                  </p>
                </div>
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="px-10 py-3 bg-slate-900 text-white text-sm font-black rounded-2xl shadow-xl shadow-slate-900/10 hover:scale-105 active:scale-95 transition-all"
                >
                  إغلاق العارض
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Room Conflict Analyzer Modal */}
        {showConflictModal && selectedRoomForConflict && (
          <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="bg-slate-900 text-white p-4 md:p-5 flex justify-between items-center relative overflow-hidden shrink-0">
                <div className="absolute top-0 right-0 w-64 h-64 bg-rose-600/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10 flex gap-4 items-center">
                  <div className="bg-rose-50 p-2 sm:p-2.5 rounded-xl shadow-xl shadow-rose-500/10">
                    <AlertTriangle size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold">
                      {language === "ar" ? "تشخيص تعارضات القاعة: " : "Conflict Inspector: "} {selectedRoomForConflict.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                      <Landmark size={11} />
                      {buildings.find((b) => b.id === selectedRoomForConflict.buildingId)?.name || '---'}
                      <span className="w-1 h-1 bg-slate-550 rounded-full"></span>
                      <span>{roomTypeLabels[selectedRoomForConflict.type]}</span>
                      <span className="w-1 h-1 bg-slate-550 rounded-full"></span>
                      <span className="flex items-center gap-1">
                        <Users size={11} />
                        {language === "ar" ? "السعة الافتراضية:" : "Default Capacity:"} {selectedRoomForConflict.capacity}
                      </span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowConflictModal(false)}
                  className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors relative z-10"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 md:p-5 overflow-y-auto space-y-4">
                {(() => {
                  const roomSessions = schedule.filter(s => s.room === selectedRoomForConflict.name);
                  const allStudents = getStudents();
                  const allCourses = getCourses();

                  const timeToMin = (t: string) => {
                    if (!t) return 0;
                    const [h, m] = t.split(":").map(Number);
                    return h * 60 + m;
                  };

                  const getOverlappingSessions = (session: ClassSession) => {
                    return roomSessions.filter(
                      (other) =>
                        other.id !== session.id &&
                        other.day === session.day &&
                        timeToMin(session.startTime) < timeToMin(other.endTime) &&
                        timeToMin(other.startTime) < timeToMin(session.endTime)
                    );
                  };

                  const getEnrolledCount = (courseId: string) => {
                    return allStudents.filter(st => {
                      const s = st as any;
                      return (s.grades?.some((g: any) => g.courseId === courseId) ||
                              s.enrollments?.some((e: any) => e.courseId === courseId));
                    }).length;
                  };

                  const isOverCapacity = (session: ClassSession) => {
                    const enrolled = getEnrolledCount(session.courseId);
                    return enrolled > selectedRoomForConflict.capacity;
                  };

                  const getCourseCode = (courseId: string) => {
                    return allCourses.find(c => c.id === courseId)?.code || "N/A";
                  };

                  // Diagnostics calculations
                  const overlapCount = roomSessions.filter(s => getOverlappingSessions(s).length > 0).length;
                  const capacityIssueCount = roomSessions.filter(s => isOverCapacity(s)).length;
                  const hasAnyConflict = overlapCount > 0 || capacityIssueCount > 0;

                  return (
                    <>
                      {/* Executive Diagnostics Board */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Status card */}
                        <div className={`p-5 rounded-2xl border flex flex-col justify-between ${
                          hasAnyConflict 
                            ? "bg-rose-50 border-rose-200 text-rose-850" 
                            : "bg-emerald-50 border-emerald-200 text-emerald-850"
                        }`}>
                          <div className="flex items-center gap-2 font-black text-sm uppercase tracking-wide">
                            {hasAnyConflict ? <AlertTriangle size={18} /> : <Sparkles size={18} />}
                            {language === "ar" ? "حالة التعارض الإجمالية" : "Overall Conflict Status"}
                          </div>
                          <div className="mt-2.5">
                            <p className="text-base font-bold">
                              {hasAnyConflict 
                                ? language === "ar" ? "تم رصد تعارضات فاعلة" : "Conflicts Identified"
                                : language === "ar" ? "جدول سليم ومتوافق" : "100% Schedule Compliant"
                              }
                            </p>
                            <p className="text-xs mt-1 opacity-80 font-semibold">
                              {hasAnyConflict 
                                ? language === "ar" ? "يجب تعديل مواعيد المحاضرات لتجنب التضارب" : "Rescheduling is recommended to resolve clashes."
                                : language === "ar" ? "لا يسجل النظام أي تشابك زمني أو أحمال زائدة" : "No scheduling overlaps or capacity overloads detected."
                              }
                            </p>
                          </div>
                        </div>

                        {/* Overlap Summary Card */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              {language === "ar" ? "التضاربات الزمنية" : "TIME OVERLAPS"}
                            </p>
                            <p className="text-lg sm:text-xl font-bold text-slate-800 mt-0.5">
                              {Math.round(overlapCount / 2)}
                            </p>
                            <p className="text-xs text-slate-400 font-bold mt-1">
                              {language === "ar" ? "محاضرات تقام في نفس الوقت" : "Sessions scheduled simultaneously"}
                            </p>
                          </div>
                          <div className={`p-4 rounded-xl ${overlapCount > 0 ? 'bg-rose-105 text-rose-600' : 'bg-slate-100 text-slate-400'}`}>
                            <Clock size={24} />
                          </div>
                        </div>

                        {/* Capacity Alerts Card */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              {language === "ar" ? "تجاوز الطاقة الاستيعابية" : "CAPACITY OVERLOADS"}
                            </p>
                            <p className="text-lg sm:text-xl font-bold text-slate-800 mt-0.5">
                              {capacityIssueCount}
                            </p>
                            <p className="text-xs text-slate-400 font-bold mt-1">
                              {language === "ar" ? "شعبة دراسية تفوق سعة المقاعد" : "Courses exceeding physical limits"}
                            </p>
                          </div>
                          <div className={`p-4 rounded-xl ${capacityIssueCount > 0 ? 'bg-amber-105 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                            <Users size={24} />
                          </div>
                        </div>
                      </div>

                      {/* Booked Sessions Chronology & audit Panel */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-extrabold text-slate-500 tracking-wider uppercase flex items-center gap-2">
                          <Calendar size={16} className="text-blue-500" />
                          {language === "ar" ? "الحجوزات التفصيلية والتشخيصية للفصل الدراسي" : "Current Semester Detailed Bookings & Diagnostics"}
                        </h4>

                        <div className="space-y-3">
                          {roomSessions.length > 0 ? (
                            roomSessions.map((session) => {
                              const overlaps = getOverlappingSessions(session);
                              const checkOver = isOverCapacity(session);
                              const enrolled = getEnrolledCount(session.courseId);

                              return (
                                <div
                                  key={session.id}
                                  className={`bg-white border rounded-[20px] p-5 shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                                    overlaps.length > 0 
                                      ? "border-rose-300 ring-1 ring-rose-200 bg-rose-50/10" 
                                      : checkOver 
                                      ? "border-amber-300 ring-1 ring-amber-200 bg-amber-50/10" 
                                      : "border-slate-200 hover:border-slate-300"
                                  }`}
                                >
                                  {/* Left/Main Session info */}
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-3 flex-wrap">
                                      <span className="bg-slate-900 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-md tracking-wider">
                                        {getDayLabel(session.day)}
                                      </span>
                                      <span className="text-sm font-black text-blue-605 font-mono">
                                        {getCourseCode(session.courseId)}
                                      </span>
                                      <span className="text-xs font-bold text-slate-400">
                                        ID: {session.courseId.substring(0, 8)}
                                      </span>
                                    </div>

                                    <div>
                                      <h5 className="font-extrabold text-slate-800 text-base">
                                        {session.courseName}
                                      </h5>
                                      <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1.5 leading-none">
                                        <Users size={12} className="text-slate-400" />
                                        {language === "ar" ? `المحاضر: ${session.instructorName}` : `Instructor: ${session.instructorName}`}
                                        <span className="mx-1.5 opacity-40">|</span>
                                        <Clock size={12} className="text-slate-400" />
                                        {session.startTime} - {session.endTime}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Right conflict/actions panel */}
                                  <div className="flex flex-col gap-2 min-w-[200px] text-right md:-translate-y-0.5">
                                    {/* Capacity check info */}
                                    <div className={`p-2 rounded-xl flex items-center justify-between text-xs font-bold ${
                                      checkOver ? 'bg-amber-100 text-amber-800' : 'bg-slate-50 text-slate-500'
                                    }`}>
                                      <span>{language === "ar" ? "الطلاب المسجلون:" : "Enrolled Students:"}</span>
                                      <span className={`font-mono text-sm font-black ${checkOver ? 'text-amber-700' : 'text-slate-700'}`}>
                                        {enrolled} / {selectedRoomForConflict.capacity}
                                      </span>
                                    </div>

                                    {/* Error/warning Badges inside card */}
                                    <div className="space-y-1.5">
                                      {overlaps.length > 0 && (
                                        <div className="bg-rose-100 text-rose-800 border border-rose-200 rounded-xl p-2.5 text-[11px] font-bold text-right">
                                          <p className="flex items-center gap-1 text-rose-700 font-black mb-1 justify-end">
                                            {language === "ar" ? "تعارض دراسي زمني!" : "Time Slot Clashing!"}
                                            <AlertTriangle size={12} />
                                          </p>
                                          <p className="leading-tight text-[10px]">
                                            {language === "ar" 
                                              ? `تتعارض هذه الحصة مع المحاضرة الموازية:` 
                                              : `Scheduled at the exact same hour as:`}
                                          </p>
                                          {overlaps.map(over => (
                                            <p key={over.id} className="font-black text-rose-900 mt-0.5 block">
                                              • {over.courseName} ({over.startTime} - {over.endTime})
                                            </p>
                                          ))}
                                        </div>
                                      )}

                                      {checkOver && (
                                        <div className="bg-amber-100 text-amber-850 border border-amber-250 rounded-xl p-2.5 text-[11px] font-medium text-right">
                                          <p className="flex items-center gap-1 text-amber-800 font-black mb-1 justify-end">
                                            {language === "ar" ? "تجاوز قدرة القاعة" : "Capacity Overloaded"}
                                            <Info size={12} />
                                          </p>
                                          <p className="leading-normal text-[10px]">
                                            {language === "ar"
                                              ? `عدد الطلاب المسجلين (${enrolled}) يتجاوز سعة القاعة البالغة (${selectedRoomForConflict.capacity}).`
                                              : `Enrolled students (${enrolled}) exceed maximum room seats (${selectedRoomForConflict.capacity}).`}
                                          </p>
                                        </div>
                                      )}

                                      {!checkOver && overlaps.length === 0 && (
                                        <span className="bg-emerald-50 text-emerald-805 border border-emerald-100 text-[10px] px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 justify-end">
                                          {language === "ar" ? "لا توجد تعارضات" : "No Conflicts Detected"}
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-[2rem] text-slate-400 space-y-2">
                              <Sparkles size={36} className="mx-auto text-slate-300 animate-pulse" />
                              <p className="text-xs font-black uppercase">
                                {language === "ar" ? "لا توجد محاضرات مجدولة في هذه القاعة" : "No scheduled lectures found for this room"}
                              </p>
                              <p className="text-[10px] max-w-sm mx-auto text-slate-400">
                                {language === "ar" 
                                  ? "هذه القاعة ليست مخصصة لأي شعبة دراسية في الفصل الحالي بعد."
                                  : "This facility hasn't been assigned to any course streams for the current academic period."}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Footer */}
              <div className="p-4 md:p-5 bg-slate-100 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
                <div className="flex items-center gap-2 text-slate-500">
                  <Info size={14} className="text-blue-500 shrink-0" />
                  <p className="text-[10px] md:text-xs leading-normal font-bold">
                    {language === "ar" 
                      ? "يتيح هذا المحلل تفادي تضارب المواعيد والأكشاك الدراسية وحماية المدرسين من التداخلات غير المقصودة."
                      : "Use this inspector tool to resolve time overlaps or classroom capacity issues for the selected room."}
                  </p>
                </div>
                <button
                  onClick={() => setShowConflictModal(false)}
                  className="w-full md:w-auto px-10 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-2xl shadow-xl transition-all hover:scale-103"
                >
                  {language === "ar" ? "إغلاق نافذة التشخيص" : "Close Diagnostics"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Building Modal */}
      {showBuildingModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
            <div className="bg-slate-900 text-white px-4 py-2.5 flex justify-between items-center">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Landmark size={16} />
                {currentBuilding.id ? "تعديل بيانات مبنى" : "إضافة مبنى جديد"}
              </h3>
              <button onClick={() => setShowBuildingModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveBuilding} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  اسم المبنى
                </label>
                <input
                  required
                  type="text"
                  className="w-full border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={currentBuilding.name || ""}
                  onChange={(e) =>
                    setCurrentBuilding({
                      ...currentBuilding,
                      name: e.target.value,
                    })
                  }
                  placeholder="مثلاً: مبنى الهندسة المدنية"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    الرمز الكودي
                  </label>
                  <input
                    required
                    type="text"
                    className="w-full border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                    value={currentBuilding.code || ""}
                    onChange={(e) =>
                      setCurrentBuilding({
                        ...currentBuilding,
                        code: e.target.value,
                      })
                    }
                    placeholder="ENG-01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    عدد الطوابق
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    className="w-full border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={currentBuilding.floors || 1}
                    onChange={(e) =>
                      setCurrentBuilding({
                        ...currentBuilding,
                        floors: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  وصف إضافي
                </label>
                <textarea
                  className="w-full border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  rows={3}
                  value={currentBuilding.description || ""}
                  onChange={(e) =>
                    setCurrentBuilding({
                      ...currentBuilding,
                      description: e.target.value,
                    })
                  }
                  placeholder="تفاصيل الموقع أو الاستخدام الرئيسي..."
                />
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowBuildingModal(false)}
                  className="px-6 py-2 text-slate-500 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-blue-700 flex items-center gap-2"
                >
                  <Save size={18} /> حفظ البيانات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Room Modal */}
      {showRoomModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-200">
            <div className="bg-slate-900 text-white px-4 py-2.5 flex justify-between items-center">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <MapPin size={16} />
                {currentRoom.id ? "تعديل قاعة" : "إضافة قاعة جديدة"}
              </h3>
              <button onClick={() => setShowRoomModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveRoom} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    اسم/رقم القاعة
                  </label>
                  <input
                    required
                    type="text"
                    className="w-full border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={currentRoom.name || ""}
                    onChange={(e) =>
                      setCurrentRoom({ ...currentRoom, name: e.target.value })
                    }
                    placeholder="قاعة 204"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    المبنى
                  </label>
                  <select
                    required
                    className="w-full border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={currentRoom.buildingId || ""}
                    onChange={(e) =>
                      setCurrentRoom({
                        ...currentRoom,
                        buildingId: e.target.value,
                      })
                    }
                  >
                    <option value="">اختر المبنى...</option>
                    {buildings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    النوع
                  </label>
                  <select
                    className="w-full border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={currentRoom.type}
                    onChange={(e) =>
                      setCurrentRoom({
                        ...currentRoom,
                        type: e.target.value as any,
                      })
                    }
                  >
                    {Object.entries(roomTypeLabels).map(([val, label]) => (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    السعة الاستيعابية
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    className="w-full border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={currentRoom.capacity}
                    onChange={(e) =>
                      setCurrentRoom({
                        ...currentRoom,
                        capacity: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl space-y-3">
                <p className="text-xs font-bold text-slate-400 mb-2">
                  التجهيزات والحالة
                </p>
                <div className="grid grid-cols-2 gap-y-3 gap-x-6">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 outline-none"
                      checked={currentRoom.hasProjector}
                      onChange={(e) =>
                        setCurrentRoom({
                          ...currentRoom,
                          hasProjector: e.target.checked,
                        })
                      }
                    />
                    <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600 transition-colors flex items-center gap-1">
                      <Tv size={14} /> مسلاط ضوئي (Projector)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 outline-none"
                      checked={currentRoom.hasAC}
                      onChange={(e) =>
                        setCurrentRoom({
                          ...currentRoom,
                          hasAC: e.target.checked,
                        })
                      }
                    />
                    <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600 transition-colors flex items-center gap-1">
                      <Wind size={14} /> تكييف مركزي
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 outline-none"
                      checked={currentRoom.hasSmartBoard}
                      onChange={(e) =>
                        setCurrentRoom({
                          ...currentRoom,
                          hasSmartBoard: e.target.checked,
                        })
                      }
                    />
                    <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600 transition-colors flex items-center gap-1">
                      <MonitorPlay size={14} /> سبورة ذكية
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 outline-none"
                      checked={currentRoom.hasPC}
                      onChange={(e) =>
                        setCurrentRoom({
                          ...currentRoom,
                          hasPC: e.target.checked,
                        })
                      }
                    />
                    <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600 transition-colors flex items-center gap-1">
                      <Monitor size={14} /> أجهزة حاسوب (PCs)
                    </span>
                  </label>
                </div>
                <div className="pt-3 border-t border-slate-200/50 mt-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 text-green-600 outline-none"
                      checked={currentRoom.isAvailable}
                      onChange={(e) =>
                        setCurrentRoom({
                          ...currentRoom,
                          isAvailable: e.target.checked,
                        })
                      }
                    />
                    <span className="text-sm font-bold text-slate-700">
                      القاعة متاحة للاستخدام حالياً
                    </span>
                  </label>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowRoomModal(false)}
                  className="px-6 py-2 text-slate-500 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-200"
                >
                  <Save size={18} /> حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Facilities;
