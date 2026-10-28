# CloudBase Cloud API (CloudAPI) Reference

> - Data sources: [API Overview](https://cloud.tencent.com/document/api/876/34809) · [Dependent Product API Guide](https://cloud.tencent.com/document/api/876/34808)
> - All APIs are Tencent Cloud API 3.0 management-plane APIs, callable via official SDKs in any language; they can also be called through the CloudBase MCP `callCloudApi` tool or [API Explorer](https://console.cloud.tencent.com/api/explorer)
> - Last synced: 2026-10-09

## API Overview


### Environment APIs

| API Name | Description | Rate Limit (req/s) |
| --- | --- | --- |
| [DescribeEnvs](https://cloud.tencent.com/document/api/876/34820) | List environments | 100 |
| [DestroyEnv](https://cloud.tencent.com/document/api/876/42149) | Destroy environment | 20 |
| [CheckTcbService](https://cloud.tencent.com/document/api/876/42154) | Check if CloudBase service is enabled | 20 |
| [CreateBillDeal](https://cloud.tencent.com/document/api/876/128117) | Create billing order | 20 |
| [DescribeBillingInfo](https://cloud.tencent.com/document/api/876/94390) | Get billing information | 50 |
| [DescribeEnvAccountCircle](https://cloud.tencent.com/document/api/876/128119) | Query environment current billing cycle | 20 |
| [DescribeBaasPackageList](https://cloud.tencent.com/document/api/876/78167) | Get plan packages | 20 |
| [DescribeStaticStore](https://cloud.tencent.com/document/api/876/128129) | Query static hosting resource info | 20 |
| [CreateStaticStore](https://cloud.tencent.com/document/api/876/42152) | Create static hosting resources | 200 |
| [DescribeSafeRule](https://cloud.tencent.com/document/api/876/128118) | Query database security rules | 20 |
| [DescribeAuthDomains](https://cloud.tencent.com/document/api/876/42151) | List authorized domains | 20 |
| [CreateAuthDomain](https://cloud.tencent.com/document/api/876/42764) | Add authorized domain | 20 |
| [ModifyEnv](https://cloud.tencent.com/document/api/876/34818) | Update environment info | 50 |
| [CreateHostingDomain](https://cloud.tencent.com/document/api/876/42153) | Create hosting domain | 20 |
| [DestroyStaticStore](https://cloud.tencent.com/document/api/876/42148) | Destroy static hosting resources | 20 |
| [DescribeEnvLimit](https://cloud.tencent.com/document/api/876/42146) | Query environment count limit | 20 |
| [DescribeHostingDomainTask](https://cloud.tencent.com/document/api/876/57514) | Query static hosting domain task status | 20 |
| [DescribeQuotaData](https://cloud.tencent.com/document/api/876/42145) | Query environment quota usage | 2000 |
| [BindStorageSource](https://cloud.tencent.com/document/api/876/132025) | Bind external storage source to cloud storage | 20 |
| [ModifyStorageSource](https://cloud.tencent.com/document/api/876/132024) | Update cloud storage external data source | 20 |
| [UnbindStorageSource](https://cloud.tencent.com/document/api/876/132023) | Unbind external cloud storage source | 20 |
| [CreateEnvResource](https://cloud.tencent.com/document/api/876/129358) | Create environment-related resources | 20 |
| [AllocateEnv](https://cloud.tencent.com/document/api/876/131594) | Allocate environment from pool | 3000 |
| [ReleaseEnv](https://cloud.tencent.com/document/api/876/131592) | Release environment allocated from pool | 1000 |
| [AssumeRoleForAllocatedEnv](https://cloud.tencent.com/document/api/876/131593) | Request role temporary credentials for pooled environment | 1000 |
| [DescribePlatformAccountCircle](https://cloud.tencent.com/document/api/876/138296) | Query the billing cycle for platform resources | 20 |
| [ModifyEnvExtra](https://cloud.tencent.com/document/api/876/137192) | Modify environment extra configuration | 20 |
| [CreatePlatformEnv](https://cloud.tencent.com/document/api/876/138302) | Create an environment with a platform plan | 20 |
| [DestroyPlatformEnv](https://cloud.tencent.com/document/api/876/138297) | Delete a platform environment | 20 |
| [DescribePlatforms](https://cloud.tencent.com/document/api/876/138298) | Query platform resource information | 20 |
| [ModifyPlatformEnv](https://cloud.tencent.com/document/api/876/138295) | Modify platform environment information | 20 |

### User Permission APIs

| API Name | Description | Rate Limit (req/s) |
| --- | --- | --- |
| [DeleteUsers](https://cloud.tencent.com/document/api/876/127960) | Delete CloudBase users | 20 |
| [CreateUser](https://cloud.tencent.com/document/api/876/127961) | Create CloudBase user | 20 |
| [DescribeUserList](https://cloud.tencent.com/document/api/876/127959) | List CloudBase users | 20 |
| [ModifyUser](https://cloud.tencent.com/document/api/876/127958) | Update CloudBase user | 20 |
| [DescribeResourcePermission](https://cloud.tencent.com/document/api/876/132256) | Query resource permissions | 20 |
| [ModifyResourcePermission](https://cloud.tencent.com/document/api/876/132255) | Modify resource permissions | 20 |
| [CreateCustomLoginKey](https://cloud.tencent.com/document/api/876/130046) | Generate a custom login key | 20 |
| [DescribeClient](https://cloud.tencent.com/document/api/876/129355) | Query app client details | 20 |
| [ModifyLoginConfig](https://cloud.tencent.com/document/api/876/129351) | Modify login policy | 20 |
| [DescribeLoginConfig](https://cloud.tencent.com/document/api/876/129354) | Get login policy | 20 |
| [ModifyClient](https://cloud.tencent.com/document/api/876/129352) | Modify an app client | 20 |
| [GetProviders](https://cloud.tencent.com/document/api/876/129353) | List third-party authentication providers | 20 |
| [ModifyProvider](https://cloud.tencent.com/document/api/876/129350) | Modify a third-party authentication provider | 20 |
| [DeleteProvider](https://cloud.tencent.com/document/api/876/129356) | Delete a third-party authentication provider | 20 |
| [AddProvider](https://cloud.tencent.com/document/api/876/129357) | Add a third-party authentication provider | 20 |
| [CreateApiKey](https://cloud.tencent.com/document/api/876/129835) | Create a CloudBase API Key | 20 |
| [DeleteApiKey](https://cloud.tencent.com/document/api/876/129834) | Delete a CloudBase API Key | 20 |
| [DescribeApiKeyList](https://cloud.tencent.com/document/api/876/129833) | List CloudBase API Keys | 20 |

### HTTP Gateway APIs

| API Name | Description | Rate Limit (req/s) |
| --- | --- | --- |
| [CreateHTTPServiceRoute](https://cloud.tencent.com/document/api/876/129800) | Create HTTP service route | 20 |
| [VerifyHTTPServiceRoute](https://cloud.tencent.com/document/api/876/135630) | Verify HTTP service route | 20 |
| [DeleteHTTPServiceRoute](https://cloud.tencent.com/document/api/876/129799) | Delete HTTP service route | 20 |
| [DescribeHTTPServiceRoute](https://cloud.tencent.com/document/api/876/129798) | Query HTTP service route info | 20 |
| [ModifyHTTPServiceRoute](https://cloud.tencent.com/document/api/876/129797) | Modify HTTP service route | 20 |
| [DescribeHTTPServiceCachePurgeTask](https://cloud.tencent.com/document/api/876/137742) | Query HTTP service cache purge task | 20 |
| [PurgeHTTPServiceCache](https://cloud.tencent.com/document/api/876/137741) | Purge HTTP service domain cache | 20 |
| [CreatePlatformHTTPServiceRoute](https://cloud.tencent.com/document/api/876/138911) | Create platform HTTP access service route | 20 |
| [VerifyPlatformHTTPServiceRoute](https://cloud.tencent.com/document/api/876/138907) | Verify platform HTTP access service route | 20 |
| [DeletePlatformHTTPServiceRoute](https://cloud.tencent.com/document/api/876/138910) | Delete platform HTTP access service route | 20 |
| [DescribePlatformHTTPServiceRoute](https://cloud.tencent.com/document/api/876/138909) | Query platform HTTP access service route info | 20 |
| [ModifyPlatformHTTPServiceRoute](https://cloud.tencent.com/document/api/876/138908) | Modify platform HTTP access service route | 20 |
| [DescribeGatewayVersions](https://cloud.tencent.com/document/api/876/129795) | Query gateway version info | 20 |
| [DeleteAuthDomain](https://cloud.tencent.com/document/api/876/128960) | Delete authorized domain | 20 |

### CloudBase Run APIs

| API Name | Description | Rate Limit (req/s) |
| --- | --- | --- |
| [DescribeCloudBaseRunServerVersion](https://cloud.tencent.com/document/api/876/49739) | Query CloudBase Run service version details | 1000 |
| [DescribeCloudBaseBuildService](https://cloud.tencent.com/document/api/876/48345) | Get CloudBase Run code upload and download URLs | 20 |

### Billing APIs

| API Name | Description | Rate Limit (req/s) |
| --- | --- | --- |
| [CreateEnv](https://cloud.tencent.com/document/api/876/128592) | Create environment | 20 |
| [ModifyEnvPlan](https://cloud.tencent.com/document/api/876/128591) | Update CloudBase environment plan | 20 |
| [RenewEnv](https://cloud.tencent.com/document/api/876/128590) | Renew CloudBase environment | 20 |
| [DescribeCreditsUsage](https://cloud.tencent.com/document/api/876/132935) | Get credits usage | 20 |
| [DescribeCreditsUsageDetail](https://cloud.tencent.com/document/api/876/132934) | Get credits usage details | 20 |
| [DescribeEnvPlans](https://cloud.tencent.com/document/api/876/133103) | Query environment plan info | 20 |
| [DescribePlatformCreditsUsage](https://cloud.tencent.com/document/api/876/138301) | Get platform resource credit usage | 20 |
| [DescribePlatformCreditsUsageDetail](https://cloud.tencent.com/document/api/876/138300) | Get platform resource credit usage details | 20 |
| [DescribePlatformEnvUsage](https://cloud.tencent.com/document/api/876/138299) | Query platform environment resource usage | 20 |

### Document Database APIs

| API Name | Description | Rate Limit (req/s) |
| --- | --- | --- |
| [ModifyDatabaseACL](https://cloud.tencent.com/document/api/876/34819) | Modify document database permissions | 50 |
| [DescribeDatabaseACL](https://cloud.tencent.com/document/api/876/34821) | Get document database permissions | 50 |
| [CreateTable](https://cloud.tencent.com/document/api/876/127968) | Create document database collection | 20 |
| [DeleteTable](https://cloud.tencent.com/document/api/876/127967) | Delete document database collection | 20 |
| [DescribeTable](https://cloud.tencent.com/document/api/876/127966) | Query document database collection info | 20 |
| [DescribeTables](https://cloud.tencent.com/document/api/876/127962) | Query all document database collection info | 20 |
| [ListTables](https://cloud.tencent.com/document/api/876/127965) | List document database collections | 20 |
| [UpdateTable](https://cloud.tencent.com/document/api/876/127964) | Modify document database collection index info | 20 |
| [RunCommands](https://cloud.tencent.com/document/api/876/129012) | Execute document database commands | 1000 |
| [ModifySafeRule](https://cloud.tencent.com/document/api/876/128959) | Set database security rules | \- |

### Static Hosting APIs

| API Name | Description | Rate Limit (req/s) |
| --- | --- | --- |
| [DescribeCloudAppCosInfo](https://cloud.tencent.com/document/api/876/135278) | Get CloudApp COS info | 20 |
| [CreateCloudApp](https://cloud.tencent.com/document/api/876/135281) | Create CloudApp | 20 |
| [DeleteCloudApp](https://cloud.tencent.com/document/api/876/135280) | Delete CloudApp service | 20 |
| [DeleteCloudAppVersion](https://cloud.tencent.com/document/api/876/135279) | Delete CloudApp service version | 20 |
| [DescribeCloudAppInfo](https://cloud.tencent.com/document/api/876/135277) | Query CloudApp service info | 20 |
| [DescribeCloudAppList](https://cloud.tencent.com/document/api/876/132936) | List CloudApp services | 20 |
| [DescribeCloudAppVersion](https://cloud.tencent.com/document/api/876/135276) | Query CloudApp service version info | 20 |
| [DescribeCloudAppVersionList](https://cloud.tencent.com/document/api/876/135275) | List CloudApp service versions | 20 |
| [DescribeCloudBaseRunBuildLog](https://cloud.tencent.com/document/api/876/135707) | Query build logs | 20 |

### AI Model APIs

| API Name | Description | Rate Limit (req/s) |
| --- | --- | --- |
| [CreateAIModel](https://cloud.tencent.com/document/api/876/131320) | Create AI model | 20 |
| [DeleteAIModel](https://cloud.tencent.com/document/api/876/131319) | Delete AI model | 20 |
| [DescribeAIModels](https://cloud.tencent.com/document/api/876/131318) | List AI models | 20 |
| [DescribeManagedAIModelList](https://cloud.tencent.com/document/api/876/131317) | List managed AI models | 20 |
| [UpdateAIModel](https://cloud.tencent.com/document/api/876/131316) | Update AI model | 20 |

### Logging and Monitoring APIs

| API Name | Description | Rate Limit (req/s) |
| --- | --- | --- |
| [BindCls](https://cloud.tencent.com/document/api/876/136527) | Bind custom CLS log topic | 20 |
| [SearchClsLog](https://cloud.tencent.com/document/api/876/128127) | Search CLS logs | 20 |
| [ModifyClsTopic](https://cloud.tencent.com/document/api/876/81547) | Modify log topic | 20 |
| [DescribeCurveData](https://cloud.tencent.com/document/api/876/129258) | Query environment monitoring curves | 100 |

### SQL Database APIs

| API Name | Description | Rate Limit (req/s) |
| --- | --- | --- |
| [CreateMySQL](https://cloud.tencent.com/document/api/876/128186) | Enable MySQL | 20 |
| [DescribePGUserMigration](https://cloud.tencent.com/document/api/876/132262) | View single PG migration details for environment | 20 |
| [ListPGUserMigrations](https://cloud.tencent.com/document/api/876/132261) | List applied PG migrations for environment | 20 |
| [PreviewPGUserMigrations](https://cloud.tencent.com/document/api/876/132260) | Preview SQL migration execution plan (dry run) | 20 |
| [PushPGUserMigrations](https://cloud.tencent.com/document/api/876/132259) | Batch apply migrations | 20 |
| [RepairPGUserMigrationHistory](https://cloud.tencent.com/document/api/876/132258) | Repair migration history | 20 |
| [DescribeCreateMySQLResult](https://cloud.tencent.com/document/api/876/128185) | Query MySQL creation result | 20 |
| [DescribeMySQLClusterDetail](https://cloud.tencent.com/document/api/876/128184) | Query MySQL cluster info | 20 |
| [DescribeMySQLTaskStatus](https://cloud.tencent.com/document/api/876/128183) | Query MySQL destruction result | 20 |
| [DestroyMySQL](https://cloud.tencent.com/document/api/876/128182) | Destroy MySQL | 20 |
| [RunSql](https://cloud.tencent.com/document/api/876/127880) | Execute MySQL statement | 100 |
| [ExecutePGSql](https://cloud.tencent.com/document/api/876/130469) | Execute SQL query on PostgreSQL | 20 |
| [ModifyPGInstanceSpec](https://cloud.tencent.com/document/api/876/137349) | Modify PG dedicated instance spec | 20 |
| [UpgradePGInstanceToDedicated](https://cloud.tencent.com/document/api/876/138617) | Upgrade a shared PG instance to a dedicated instance | 20 |
| [ResetPGAccountPassword](https://cloud.tencent.com/document/api/876/138618) | Reset a PG instance user role password | 20 |
| [DescribeTaskResult](https://cloud.tencent.com/document/api/876/138619) | Query task results | 20 |


### Cloud Function APIs

| API Name | Description | Rate Limit (req/s) |
| --- | --- | --- |
| [CreateFunction](https://cloud.tencent.com/document/api/876/137951) | Create cloud function | 20 |
| [DeleteFunction](https://cloud.tencent.com/document/api/876/137950) | Delete cloud function | 20 |
| [UpdateFunctionConfiguration](https://cloud.tencent.com/document/api/876/137946) | Update function configuration | 20 |
| [ListFunctions](https://cloud.tencent.com/document/api/876/137947) | List functions | 20 |
| [GetFunction](https://cloud.tencent.com/document/api/876/137948) | Get cloud function details | 20 |
| [DownloadFunction](https://cloud.tencent.com/document/api/876/137949) | Get cloud function download address | 20 |
| [UpdateFunctionCode](https://cloud.tencent.com/document/api/876/137952) | Update cloud function code | 20 |

> Note:
>
> The rate limits above are per `API + access region + sub-account`. For more details on rate limiting, see: [API Rate Limit Guide](https://cloud.tencent.com/document/product/1278/109059)

## Dependent Product API Guide

### Overview

CloudBase (Tencent CloudBase, TCB) is a cloud-native integrated development environment and tool platform provided by Tencent Cloud. It offers developers a highly available, auto-scaling serverless backend service including compute, storage, and hosting capabilities. It can be used for cloud-integrated development of various client applications (Mini Programs, Official Accounts, Web apps, etc.), helping developers build and manage backend services and cloud resources in one place, avoiding the complexity of server setup and operations so they can focus on business logic.

The CloudBase APIs described in this section are all API 3.0/API 2.0 interfaces.
You can call these APIs to operate CloudBase, for example to get user permissions or list CloudBase projects.
For all supported APIs, see [API Overview](https://cloud.tencent.com/document/product/876/34809).

### CloudBase Dependent Resource API Guide

#### MySQL Database

> **Note**: When calling the following MySQL APIs, you need to pass the database cluster ID (`ClusterId`). You can call [DescribeMySQLClusterDetail](https://cloud.tencent.com/document/api/876/128184) and use the `DbClusterId` field from the response as the value for `ClusterId`.

##### Account Management

| API Name | Description |
| --- | --- |
| [CreateAccounts](https://cloud.tencent.com/document/product/1003/71660) | Create user accounts |
| [DeleteAccounts](https://cloud.tencent.com/document/product/1003/92718) | Delete user accounts |
| [DescribeAccountAllGrantPrivileges](https://cloud.tencent.com/document/product/1003/70114) | Query all grantable privileges for an account |
| [DescribeAccountPrivileges](https://cloud.tencent.com/document/product/1003/92717) | Query existing privileges for an account |
| [DescribeAccounts](https://cloud.tencent.com/document/product/1003/48075) | List database accounts |
| [ModifyAccountDescription](https://cloud.tencent.com/document/product/1003/92716) | Modify database account description |
| [ModifyAccountHost](https://cloud.tencent.com/document/product/1003/92715) | Modify account host |
| [ModifyAccountParams](https://cloud.tencent.com/document/product/1003/70112) | Modify account parameters |
| [ModifyAccountPrivileges](https://cloud.tencent.com/document/product/1003/92714) | Modify account database/table privileges |
| [ResetAccountPassword](https://cloud.tencent.com/document/product/1003/83592) | Reset database account password |

##### Network Management

| API Name | Description |
| --- | --- |
| [CloseWan](https://cloud.tencent.com/document/product/1003/92737) | Disable public network access |
| [OpenWan](https://cloud.tencent.com/document/product/1003/92732) | Enable public network access |

##### Serverless Cluster Management

| API Name | Description |
| --- | --- |
| [ResumeServerless](https://cloud.tencent.com/document/product/1003/70121) | Resume serverless cluster |

##### Backup and Rollback

| API Name | Description |
| --- | --- |
| [CreateBackup](https://cloud.tencent.com/document/product/1003/80212) | Create manual backup |
| [DeleteBackup](https://cloud.tencent.com/document/product/1003/82201) | Delete manual backup |
| [ModifyBackupConfig](https://cloud.tencent.com/document/product/1003/48090) | Modify auto-backup configuration |
| [DescribeBackupList](https://cloud.tencent.com/document/product/1003/48093) | List backup files |
| [DescribeBackupDownloadUrl](https://cloud.tencent.com/document/product/1003/76374) | Get backup download URL |
| [RollBackCluster](https://cloud.tencent.com/document/product/1003/70115) | Cluster rollback |

##### Task and Database Management

| API Name | Description |
| --- | --- |
| [DescribeTasks](https://cloud.tencent.com/document/product/1003/103866) | List tasks |
| [DescribeClusterDatabaseTables](https://cloud.tencent.com/document/product/1003/113981) | Get table list |
| [DescribeClusterDatabases](https://cloud.tencent.com/document/product/1003/101559) | Get cluster database list |

#### SCF Cloud Functions

> Additionally, when calling cloud function APIs you need to pass these two parameters:
>
> *   **Stamp**: Fixed value `"MINI_QCBASE"`
>
> *   **Role**: Cloud function execution role name.
>
>     ⚠️ **Security note**: If you are a **regular user (single-environment account)**, you can directly use the default role `TCB_QcsRole` with no extra configuration.
>
>     If you are a **platform customer** managing multiple tenants via environment isolation, using `TCB_QcsRole` poses a **cross-environment privilege escalation risk**. It is recommended to create an independent custom CAM role for each environment:
>
>     1.  Go to the [CAM Role Console](https://console.cloud.tencent.com/cam/role) to create a role;
>     2.  Select **Tencent Cloud Product Service** as the role entity;
>     3.  Check **SCF (Cloud Functions)** and **CLS (Log Service)** as the authorized services;
>     4.  Attach the policy **`QcloudCLSFullAccess`**;
>     5.  Note the role name (e.g. `SCF_CLSFullAccess`) and pass it as the `Role` parameter value.

| API Name | Description |
| --- | --- |
| [CreateFunction](https://cloud.tencent.com/document/api/876/137951) | Create function |
| [UpdateFunctionCode](https://cloud.tencent.com/document/api/876/137952) | Update function code |
| [ListFunctions](https://cloud.tencent.com/document/api/876/137947) | List functions |
| [Invoke](https://cloud.tencent.com/document/product/583/17243) | Invoke function |
| [GetFunction](https://cloud.tencent.com/document/api/876/137948) | Get function details |
| [DownloadFunction](https://cloud.tencent.com/document/api/876/137949) | Get cloud function address and download it |
| [CreateTrigger](https://cloud.tencent.com/document/product/583/18589) | Create function trigger |
| [DeleteTrigger](https://cloud.tencent.com/document/product/583/18588) | Delete trigger |
| [CopyFunction](https://cloud.tencent.com/document/product/583/33847) | Copy function |
| [UpdateFunctionConfiguration](https://cloud.tencent.com/document/api/876/137946) | Update function configuration |
| [DeleteFunction](https://cloud.tencent.com/document/api/876/137950) | Delete function |

#### COS Object Operations

> **Note**: When calling file operation APIs, you need to obtain the corresponding storage information based on the upload target:
>
> *   **Upload to static hosting**: Call [DescribeEnvs](https://cloud.tencent.com/document/product/876/34820) and use the `StaticStorages` field from the response ([StaticStorageInfo structure](https://cloud.tencent.com/document/api/876/34822#StaticStorageInfo)) for static resource info.
> *   **Upload to cloud storage**: Call [DescribeEnvs](https://cloud.tencent.com/document/product/876/34820) and use the `StorageInfo` field from the response ([StorageInfo structure](https://cloud.tencent.com/document/api/876/34822#StorageInfo)) for cloud storage info.

| Node SDK API Name | Description |
| --- | --- |
| [uploadFile](https://cloud.tencent.com/document/product/436/64980) | Upload object |
| [GetObject](https://cloud.tencent.com/document/api/436/7753) | Download object |
| [DeleteObject](https://cloud.tencent.com/document/api/436/7743) | Delete object |
| [DeleteMultipleObjects](https://cloud.tencent.com/document/api/436/8289) | Batch delete objects |
| [PutObjectCopy](https://cloud.tencent.com/document/api/436/10881) | Move/copy object |
| [Select](https://cloud.tencent.com/document/api/436/37641) | Select object content |

### API Quick Start

You can use the API Explorer tool to call APIs online.
This example uses **List Environments** to demonstrate calling an API via API Explorer:

1.  Go to the [API Explorer](https://console.cloud.tencent.com/api/explorer) tool page. For more information about API Explorer, see [Using API Explorer](https://cloud.tencent.com/document/product/1278/46697).
2.  Call [DescribeEnvs](https://cloud.tencent.com/document/product/876/34820) to retrieve CloudBase environment information.
