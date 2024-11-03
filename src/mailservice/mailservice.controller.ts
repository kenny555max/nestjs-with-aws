import { Controller } from '@nestjs/common';
import {MailService} from "./mailservice.service";

@Controller('mailservice')
export class MailserviceController {
    constructor(private readonly mailserviceService: MailService) {}
}
