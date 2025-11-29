import { eventRepository } from '../repositories/EventRepository';
import { memberRepository } from '../repositories/MemberRepository';
import { triggerEventChannel } from '../lib/pusher';

export class EventService {
  /**
   * Check if current time is within event time window
   */
  isWithinTimeWindow(event: { startTime: Date; endTime: Date }): boolean {
    const now = new Date();
    return now >= event.startTime && now <= event.endTime;
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
    const rankings = members
      .map((member) => {
        if (!member.arrivalTime) {
          return {
            memberId: member.id,
            nickname: member.nickname || member.userId || 'Unknown',
            userId: member.userId,
            arrivalTime: null,
            status: 'absent' as const,
            lateMinutes: null,
            rank: null,
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
          rank: null, // Will be calculated below
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

