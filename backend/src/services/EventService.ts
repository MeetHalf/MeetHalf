import { eventRepository } from '../repositories/EventRepository';
import { memberRepository } from '../repositories/MemberRepository';
import { triggerEventChannel } from '../lib/pusher';

export class EventService {
  /**
   * Check if current time is within event time window
   * Includes 30 minutes before startTime and 30 minutes after endTime
   * In development mode, allows location updates at any time before event ends
   */
  isWithinTimeWindow(event: { startTime: Date; endTime: Date }): boolean {
    const now = new Date();
    const isDevelopment = process.env.NODE_ENV === 'development';
    const TIME_WINDOW_BEFORE = 30 * 60 * 1000; // 30 minutes
    const TIME_WINDOW_AFTER = 30 * 60 * 1000; // 30 minutes
    
    let windowStart: Date;
    const windowEnd = new Date(event.endTime.getTime() + TIME_WINDOW_AFTER);
    
    if (isDevelopment) {
      // 開發模式：允許在活動開始前的任何時間開始追蹤，直到活動結束後 30 分鐘
      windowStart = new Date(0); // 1970-01-01，表示任何時間都可以
    } else {
      // 生產模式：只在活動開始前 30 分鐘到結束後 30 分鐘內追蹤
      windowStart = new Date(event.startTime.getTime() - TIME_WINDOW_BEFORE);
    }
    
    // 檢查是否超過活動結束時間
    if (now > windowEnd) {
      return false;
    }
    
    // 開發模式下，不檢查 windowStart（允許任何時間開始）
    // 生產模式下，檢查是否在 windowStart 之前
    if (!isDevelopment && now < windowStart) {
      return false;
    }
    
    return true;
  }

  /**
   * Calculate arrival status (early, ontime, late)
   */
  calculateArrivalStatus(event: { startTime: Date }, arrivalTime: Date): {
    status: 'early' | 'ontime' | 'late';
    lateMinutes: number;
  } {
    const eventTime = new Date(event.startTime);
    const diffMinutes = (arrivalTime.getTime() - eventTime.getTime()) / 1000 / 60;

    if (diffMinutes < 0) {
      return { status: 'early', lateMinutes: 0 };
    } else if (diffMinutes <= 5) {
      // Consider ontime if within 5 minutes
      return { status: 'ontime', lateMinutes: 0 };
    } else {
      return { status: 'late', lateMinutes: Math.round(diffMinutes) };
    }
  }

  /**
   * Update event status based on current time
   */
  async updateEventStatuses(): Promise<void> {
    await eventRepository.updateStatusByTime();
  }

  /**
   * Get event result (rankings)
   */
  async getEventResult(eventId: number) {
    const event = await eventRepository.findById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    const members = await memberRepository.findByEventId(eventId);

    // Calculate rankings
    const rankings: Array<{
      memberId: number;
      nickname: string;
      userId: string | null;
      arrivalTime: Date | null;
      status: 'early' | 'ontime' | 'late' | 'absent';
      lateMinutes: number | null;
      rank: number | null;
      pokeCount: number;
    }> = members
      .map((member) => {
        if (!member.arrivalTime) {
          return {
            memberId: member.id,
            nickname: member.nickname || member.userId || 'Unknown',
            userId: member.userId,
            arrivalTime: null,
            status: 'absent' as const,
            lateMinutes: null,
            rank: null as number | null,
            pokeCount: 0,
          };
        }

        const arrivalStatus = this.calculateArrivalStatus(event, member.arrivalTime);
        return {
          memberId: member.id,
          nickname: member.nickname || member.userId || 'Unknown',
          userId: member.userId,
          arrivalTime: member.arrivalTime,
          status: arrivalStatus.status,
          lateMinutes: arrivalStatus.lateMinutes,
          rank: null as number | null, // Will be calculated below
          pokeCount: 0, // Will be calculated below
        };
      })
      .sort((a, b) => {
        // Sort by arrival time (earliest first)
        if (!a.arrivalTime) return 1;
        if (!b.arrivalTime) return -1;
        return a.arrivalTime.getTime() - b.arrivalTime.getTime();
      });

    // Assign ranks
    let currentRank = 1;
    for (let i = 0; i < rankings.length; i++) {
      if (rankings[i].arrivalTime) {
        rankings[i].rank = currentRank;
        currentRank++;
      }
    }

    // Calculate poke counts
    const { pokeRecordRepository } = await import('../repositories/PokeRecordRepository');
    for (const ranking of rankings) {
      if (ranking.memberId) {
        const pokes = await pokeRecordRepository.getPokesForMember(eventId, ranking.memberId);
        ranking.pokeCount = pokes.length;
      }
    }

    // Calculate stats
    const arrivedCount = rankings.filter((r) => r.arrivalTime !== null).length;
    const lateCount = rankings.filter((r) => r.status === 'late').length;
    const absentCount = rankings.filter((r) => r.status === 'absent').length;

    return {
      eventId,
      rankings,
      stats: {
        totalMembers: members.length,
        arrivedCount,
        lateCount,
        absentCount,
      },
    };
  }
}

export const eventService = new EventService();

