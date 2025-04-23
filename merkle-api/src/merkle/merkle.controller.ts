import { Controller, Get, Post, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { MerkleService } from './merkle.service';

// Data transfer objects to validate incoming data
class CreateBallotDto {
  proposalNames: string[];
  addresses: string[];
}

class AddToWhitelistDto {
  addresses: string[];
}

@Controller('merkle')
export class MerkleController {
  constructor(private readonly merkleService: MerkleService) {}

  @Get('contract-address')
  getContractAddress(): string {
    return this.merkleService.getContractAddress();
  }

  @Get('server-address')
  getServerWalletAddress(): string {
    return this.merkleService.getServerWalletAddress();
  }

  @Post('ballot')
  async createBallot(@Body() createBallotDto: CreateBallotDto) {
    try {
      const result = await this.merkleService.createBallot(
        createBallotDto.proposalNames,
        createBallotDto.addresses
      );

      return {
        success: true,
        data: result
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to create ballot',
        },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Get('ballots')
  async getAllBallots() {
    try {
      const ballots = await this.merkleService.getAllBallots();
      return {
        success: true,
        data: ballots
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to fetch ballots',
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('ballot/:id')
  async getBallotInfo(@Param('id') id: string) {
    try {
      const ballotId = parseInt(id);
      const ballotInfo = await this.merkleService.getBallotInfo(ballotId);
      return {
        success: true,
        data: ballotInfo
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || `Failed to fetch ballot ${id}`,
        },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Get('proof/:ballotId/:address')
  async getProof(@Param('ballotId') ballotId: string, @Param('address') address: string) {
    try {
      const proof = await this.merkleService.getProof(parseInt(ballotId), address);
      return {
        success: true,
        data: proof
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to generate proof',
        },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Get('whitelisted/:ballotId/:address')
  async checkWhitelisted(@Param('ballotId') ballotId: string, @Param('address') address: string) {
    try {
      const isWhitelisted = await this.merkleService.isAddressWhitelisted(parseInt(ballotId), address);
      return {
        success: true,
        data: { isWhitelisted }
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to check whitelist status',
        },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Post('whitelist/:ballotId')
  async addToWhitelist(
    @Param('ballotId') ballotId: string,
    @Body() addToWhitelistDto: AddToWhitelistDto
  ) {
    try {
      await this.merkleService.addToWhitelist(parseInt(ballotId), addToWhitelistDto.addresses);
      return {
        success: true,
        message: `Successfully added addresses to ballot ${ballotId} whitelist`,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to add addresses to whitelist',
        },
        HttpStatus.BAD_REQUEST
      );
    }
  }
}