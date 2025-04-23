// merkle.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { MerkleService } from './merkle.service';
import { MerkleController } from './merkle.controller';
import { WhitelistEntry } from './whitelist.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([WhitelistEntry]),
    ConfigModule,
  ],
  providers: [MerkleService],
  controllers: [MerkleController],
  exports: [MerkleService],
})
export class MerkleModule {}