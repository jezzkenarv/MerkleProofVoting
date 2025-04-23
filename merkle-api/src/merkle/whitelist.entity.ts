import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('whitelist_entries')
export class WhitelistEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  ballotId: number;

  @Column()
  @Index()
  address: string;

  @Column()
  dateAdded: Date;
}