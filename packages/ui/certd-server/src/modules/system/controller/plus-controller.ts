import { ALL, Body, Controller, Inject, Post, Provide } from '@midwayjs/core';
import { SysSettingsService } from '../service/sys-settings-service.js';
import { BaseController } from '../../../basic/base-controller.js';
import { appKey, verify } from '@certd/pipeline';
import { SysInstallInfo, SysLicenseInfo } from '../service/models.js';
import { logger } from '../../../utils/logger.js';
import { request } from '../../../utils/http.js';

/**
 */
@Provide()
@Controller('/api/sys/plus')
export class SysPlusController extends BaseController {
  @Inject()
  sysSettingsService: SysSettingsService;

  @Post('/active', { summary: 'sys:settings:edit' })
  async active(@Body(ALL) body) {
    const { code } = body;
    const installInfo: SysInstallInfo = await this.sysSettingsService.getSetting(SysInstallInfo);
    const formData = {
      appKey: appKey,
      code,
      subjectId: installInfo.siteId,
    };

    const res: any = await request({
      url: 'http://localhost:11007/activation/active',
      method: 'post',
      data: formData,
    });

    if (res.code > 0) {
      logger.error('激活失败', res.message);
      return this.fail(res.message, 1);
    }

    const license = res.data.license;

    let licenseInfo: SysLicenseInfo = await this.sysSettingsService.getSetting(SysLicenseInfo);
    if (!licenseInfo) {
      licenseInfo = new SysLicenseInfo();
    }
    licenseInfo.license = license;
    await this.sysSettingsService.saveSetting(licenseInfo);

    const verifyRes = await verify({
      subjectId: installInfo.siteId,
      license,
    });

    if (!verifyRes.isPlus) {
      const message = verifyRes.message || '授权码校验失败';
      logger.error(message);
      return this.fail(message, 1);
    }
    return this.ok(res.data);
  }
}
