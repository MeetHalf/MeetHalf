import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../src/index';
import prisma from '../src/lib/prisma';
import { signToken, generateGuestToken, verifyToken, verifyGuestToken } from '../src/utils/jwt';
vi.mock('../src/lib/pusher', () => ({ pusher: null, triggerEventChannel: vi.fn(), triggerUserChannel: vi.fn(), triggerGroupChannel: vi.fn(), triggerChatChannel: vi.fn(), triggerNotificationChannel: vi.fn() }));
vi.mock('../src/lib/pusherBeams', () => ({ sendPushNotification: vi.fn() }));
const ids: number[] = [];
const users: any[] = [];
const groupIds: number[] = [];
let owner: any;
let participant: any;
beforeAll(() => {
  if (!process.env.DATABASE_URL?.includes('127.0.0.1:16433/')) throw new Error('Use the isolated local test database');
});
afterAll(async () => { await prisma.event.deleteMany({ where: { id: { in: ids } } }); await prisma.chatMessage.deleteMany({ where: { senderId: { in: users.map(u=>u.userId) } } });
await prisma.notification.deleteMany({ where: { userId: { in: users.map(u=>u.userId) } } });
await prisma.friend.deleteMany({ where: { userId: { in: users.map(u=>u.userId) } } });
await prisma.friendRequest.deleteMany({ where: { fromUserId: { in: users.map(u=>u.userId) } } });
await prisma.group.deleteMany({ where: { id: { in: groupIds } } });
await prisma.user.deleteMany({ where: { id: { in: users.map(u=>u.id) } } });
await prisma.$disconnect(); });
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
describe.sequential('original event workflow', () => {
  it('creates a guest event retaining selected destination and zero latitude', async () => {
    const r = await request(app).post('/events').send({ name: 'Regression meetup', ownerId: 'guest_regression_owner', ownerNickname: 'Host', useMeetHalf: true, meetingPointName: 'Selected cafe', meetingPointLat: 0, meetingPointLng: 121, startTime: new Date(Date.now()+3600000).toISOString(), endTime: new Date(Date.now()+7200000).toISOString() });
    expect(r.status).toBe(201); owner=r.body; ids.push(owner.event.id);
    expect(owner.event.meetingPointLat).toBe(0); expect(owner.event.meetingPointName).toBe('Selected cafe'); expect(owner.guestToken).toBeTruthy();
  });
  it('gets and resolves a guest invitation code', async () => {
    const r=await request(app).get(`/events/${owner.event.id}/share-token`).set(auth(owner.guestToken));
    expect(r.status).toBe(200); expect(r.body.token).toBeTruthy();
    const resolve=await request(app).get(`/invite/${r.body.token}`); expect(resolve.status).toBe(200);
  });
  it('joins as a guest and grants member access to the invite code', async () => {
    const r=await request(app).post(`/events/${owner.event.id}/join`).send({ nickname:'Guest',shareLocation:false,travelMode:'walking' });
    expect(r.status).toBe(201); participant=r.body;
    expect(participant.guestToken).toBeTruthy();
    expect((await request(app).get(`/events/${owner.event.id}/share-token`).set(auth(participant.guestToken))).status).toBe(200);
  });
  it('lets the verified guest host edit but rejects forged ownership and other members', async () => {
    const url=`/events/${owner.event.id}`;
    expect((await request(app).patch(url).send({ownerId:owner.event.ownerId,name:'Forged'})).status).toBe(403);
    expect((await request(app).patch(url).set(auth(participant.guestToken)).send({name:'Not host'})).status).toBe(403);
    expect((await request(app).patch(url).set(auth(owner.guestToken)).send({name:'Updated'})).status).toBe(200);
  });
  it('rejects guest tokens scoped to a different event and invalid date updates', async () => {
    const wrong=generateGuestToken(owner.member.id,owner.event.id+10000);
    expect((await request(app).get(`/events/${owner.event.id}/share-token`).set(auth(wrong))).status).toBe(401);
    expect((await request(app).patch(`/events/${owner.event.id}`).set(auth(owner.guestToken)).send({startTime:new Date(Date.now()+10800000).toISOString()})).status).toBe(400);
  });
  it('keeps account and member JWTs distinct', () => {
    expect(verifyToken(signToken(123)).userId).toBe(123);
    expect(()=>verifyToken(owner.guestToken)).toThrow();
    expect(verifyGuestToken(owner.guestToken).eventId).toBe(owner.event.id);
  });
});

describe.sequential('account API workflow with isolated test users', () => {
  it('loads an authenticated profile and preserves zero-valued default coordinates', async () => {
    for (const suffix of ['a','b']) users.push(await prisma.user.create({data:{email:`regression-${suffix}@example.invalid`,userId:`regression_${suffix}`,name:`Test ${suffix}`,needsSetup:false}}));
    const r=await request(app).patch('/users/profile').set(auth(signToken(users[0].id))).send({defaultLat:0,defaultLng:121,defaultAddress:'Test location',defaultLocationName:'Origin',defaultTravelMode:'walking'});
    expect(r.status).toBe(200);
    const profile=await request(app).get('/users/profile').set(auth(signToken(users[0].id)));
    expect(profile.status).toBe(200);expect(profile.body.user.defaultLat).toBe(0);
  });
  it('sends and accepts a friend request', async () => {
    const r=await request(app).post('/friends/requests').set(auth(signToken(users[0].id))).send({toUserId:users[1].userId});
    expect(r.status).toBe(200);
    expect((await request(app).post(`/friends/requests/${r.body.request.id}/accept`).set(auth(signToken(users[1].id)))).status).toBe(200);
    const list=await request(app).get('/friends').set(auth(signToken(users[0].id)));expect(list.status).toBe(200);expect(JSON.stringify(list.body)).toContain(users[1].userId);
  });
  it('stores and retrieves a direct message without external delivery', async () => {
    const r=await request(app).post('/chat/messages').set(auth(signToken(users[0].id))).send({receiverId:users[1].userId,content:'Local regression fixture'});
    expect(r.status).toBe(200);
    const messages=await request(app).get('/chat/messages').query({receiverId:users[0].userId}).set(auth(signToken(users[1].id)));
    expect(messages.status).toBe(200);expect(JSON.stringify(messages.body)).toContain('Local regression fixture');
  });
  it('creates and reads a group', async () => {
    const r=await request(app).post('/groups').set(auth(signToken(users[0].id))).send({name:'Local regression group'});
    expect(r.status).toBe(201);groupIds.push(r.body.group.id);
    expect((await request(app).get(`/groups/${r.body.group.id}`).set(auth(signToken(users[0].id)))).status).toBe(200);
  });
});
