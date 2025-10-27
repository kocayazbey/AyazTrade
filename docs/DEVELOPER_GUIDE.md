# AyazTrade Developer Guide

## Getting Started

### Prerequisites

- **Node.js 18+** and npm
- **PostgreSQL 13+** with pgvector extension for AI features
- **Redis 6+** for caching and sessions
- **Elasticsearch 7+** for advanced search
- **Docker and Docker Compose** (recommended for development)
- **Git** and a GitHub account
- **IDE**: VS Code, IntelliJ IDEA, or similar with TypeScript support

### System Requirements

- **Minimum**: 4GB RAM, 2 CPU cores
- **Recommended**: 8GB RAM, 4 CPU cores
- **Development**: 16GB RAM, SSD storage recommended

### Quick Start

1. **Clone the Repository**
   ```bash
   git clone https://github.com/ayaztrade/ayaztrade.git
   cd ayaztrade
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp env.example .env
   # Edit .env with your configuration (see Environment Variables section)
   ```

4. **Database Setup**
   ```bash
   # Generate database schema
   npm run db:generate

   # Run migrations
   npm run db:migrate

   # Seed database with sample data
   npm run db:seed
   ```

5. **Start Development Server**
   ```bash
   npm run start:dev
   ```

6. **Access the Application**
   - **API Documentation**: http://localhost:3000/api/docs
   - **Admin Panel**: http://localhost:5001
   - **Storefront**: http://localhost:5002

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/ayaztrade
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_SECRET=your-refresh-token-secret
REFRESH_TOKEN_EXPIRES_IN=7d

# Security
BCRYPT_SALT_ROUNDS=12
RATE_LIMIT_TTL=900000
RATE_LIMIT_MAX=100

# Payment Gateways
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
IYZICO_API_KEY=...
IYZICO_SECRET_KEY=...
IYZICO_BASE_URL=https://api.iyzico.com

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# SMS Configuration
SMS_API_KEY=your-sms-api-key
SMS_API_SECRET=your-sms-api-secret

# File Upload
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name

# AI & Analytics
OPENAI_API_KEY=your-openai-api-key
ELASTICSEARCH_URL=http://localhost:9200

# Web Push Notifications
WEBPUSH_PUBLIC_KEY=your-vapid-public-key
WEBPUSH_PRIVATE_KEY=your-vapid-private-key
WEBPUSH_SUBJECT=mailto:admin@ayaztrade.com

# Monitoring
SENTRY_DSN=https://your-sentry-dsn
NEW_RELIC_LICENSE_KEY=your-new-relic-key

# External APIs
GOOGLE_ANALYTICS_ID=UA-...
FACEBOOK_PIXEL_ID=...

# Development
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
   ```

## Project Structure

```
ayaztrade/
├── 📁 src/                          # Backend source code
│   ├── 📄 app.module.ts             # Main application module
│   ├── 📄 main.ts                   # Application entry point
│   ├── 📁 config/                   # Configuration files
│   │   ├── 📄 database.config.ts    # Database configuration
│   │   ├── 📄 redis.config.ts       # Redis configuration
│   │   ├── 📄 jwt.config.ts         # JWT configuration
│   │   └── 📄 payment.config.ts     # Payment gateway configs
│   ├── 📁 core/                     # Core functionality
│   │   ├── 📁 auth/                 # Authentication system
│   │   ├── 📁 cache/                # Caching services
│   │   ├── 📁 database/             # Database schemas
│   │   ├── 📁 security/             # Security services
│   │   ├── 📁 monitoring/           # Monitoring and logging
│   │   └── 📁 middleware/           # Custom middleware
│   ├── 📁 modules/                  # Feature modules
│   │   ├── 📁 ayaz-comm/           # Main e-commerce module
│   │   ├── 📁 products/             # Product management
│   │   ├── 📁 orders/               # Order processing
│   │   ├── 📁 customers/            # CRM functionality
│   │   ├── 📁 payments/             # Payment processing
│   │   ├── 📁 analytics/            # Business intelligence
│   │   ├── 📁 inventory/            # Inventory management
│   │   ├── 📁 shipping/             # Shipping & logistics
│   │   ├── 📁 notifications/        # Multi-channel notifications
│   │   ├── 📁 integrations/         # Third-party integrations
│   │   └── 📁 ai-core/              # AI & ML features
│   └── 📁 database/                 # Database schemas and migrations
│       ├── 📁 schema/               # Entity definitions
│       ├── 📁 migrations/           # Database migrations
│       └── 📁 seeders/              # Sample data
├── 🎨 frontend/                     # Frontend applications
│   ├── 👨‍💼 admin/                   # Admin panel (Next.js)
│   ├── 🏪 storefront/               # Customer storefront (Next.js)
│   ├── 🏢 b2b-portal/               # B2B portal (Next.js)
│   └── 📱 mobile-app/               # Mobile app (React Native)
├── 📚 docs/                         # Documentation
│   ├── 📖 API_DOCUMENTATION.md     # API documentation
│   ├── 📋 DEVELOPER_GUIDE.md       # Developer guide
│   ├── 👥 USER_MANUAL.md            # User manual
│   └── 🚀 DEPLOYMENT_GUIDE.md       # Deployment guide
├── 🧪 test/                        # Test suites
│   ├── 📝 unit/                     # Unit tests
│   ├── 🔗 integration/              # Integration tests
│   ├── 🌐 e2e/                      # End-to-end tests
│   ├── ⚡ performance/              # Performance tests
│   └── 🔒 security/                 # Security tests
├── 🛠️ scripts/                      # Utility scripts
│   ├── 🚀 deploy.sh                # Deployment script
│   ├── 💾 backup.sh                # Database backup
│   ├── 🔄 migrate.sh               # Migration runner
│   └── 📊 analytics.sh             # Analytics setup
├── 🐳 docker/                       # Docker configurations
│   ├── 🐳 Dockerfile               # Application container
│   ├── 🐳 docker-compose.yml       # Development environment
│   └── 🐳 docker-compose.prod.yml  # Production environment
└── ☸️ k8s/                          # Kubernetes configurations
    ├── 🚀 deployment.yaml          # Application deployment
    ├── 🌐 ingress.yaml             # Ingress configuration
    ├── 💾 postgres.yaml            # PostgreSQL deployment
    └── 📊 monitoring.yaml          # Monitoring stack
```

## Development Workflow

### Git Workflow

1. **Feature Branches**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Commit Messages** (Conventional Commits)
   ```
   feat: add new product search functionality
   fix: resolve cart calculation bug
   docs: update API documentation
   perf: optimize database queries
   test: add unit tests for order service
   refactor: restructure authentication module
   ```

3. **Pull Requests**
   - Create PR from feature branch to develop
   - Include tests and documentation
   - Request code review from at least 2 developers
   - Update PR description with testing instructions

### Code Review Guidelines

- **Functionality**: Does the code solve the intended problem?
- **Performance**: Are there any performance bottlenecks?
- **Security**: Are there any security vulnerabilities?
- **Maintainability**: Is the code easy to understand and modify?
- **Testing**: Are there sufficient tests?
- **Documentation**: Is the code well documented?

### Development Commands

```bash
# Development
npm run start:dev          # Start development server with hot reload
npm run build              # Build the application
npm run start:prod         # Start production server

# Database
npm run db:generate        # Generate database schema
npm run db:migrate         # Run database migrations
npm run db:seed           # Seed database with sample data
npm run db:studio         # Open Drizzle Studio

# Testing
npm run test               # Run all tests
npm run test:unit          # Run unit tests only
npm run test:integration   # Run integration tests only
npm run test:e2e           # Run E2E tests only
npm run test:coverage      # Run tests with coverage report

# Linting & Formatting
npm run lint               # Run ESLint
npm run format             # Format code with Prettier
npm run type-check         # Run TypeScript compiler check

# Development Tools
npm run dev:frontend       # Start frontend development servers
npm run dev:full           # Start full development environment
npm run clean              # Clean build artifacts and node_modules
```

## Architecture

### Backend Architecture

The backend follows a modular architecture with clear separation of concerns:

- **Controllers**: Handle HTTP requests and responses
- **Services**: Contain business logic
- **Repositories**: Handle data access
- **DTOs**: Data transfer objects for validation
- **Guards**: Authentication and authorization
- **Interceptors**: Cross-cutting concerns

### Database Design

- **PostgreSQL**: Primary database
- **Redis**: Caching and session storage
- **Elasticsearch**: Search and analytics

### Frontend Architecture

- **Admin Panel**: React with Material-UI
- **Storefront**: Next.js with Tailwind CSS
- **Mobile App**: React Native
- **B2B Portal**: Next.js with custom components

## Development Workflow

### Git Workflow

1. **Feature Branches**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Commit Messages**
   ```
   feat: add new product search functionality
   fix: resolve cart calculation bug
   docs: update API documentation
   ```

3. **Pull Requests**
   - Create PR from feature branch to develop
   - Include tests and documentation
   - Request code review

### Code Standards

1. **TypeScript**
   - Use strict mode
   - Define interfaces for all data structures
   - Use type guards and assertions

2. **ESLint Configuration**
   ```json
   {
     "extends": ["@nestjs/eslint-config"],
     "rules": {
       "@typescript-eslint/no-unused-vars": "error",
       "@typescript-eslint/explicit-function-return-type": "warn"
     }
   }
   ```

3. **Prettier Configuration**
   ```json
   {
     "semi": true,
     "trailingComma": "es5",
     "singleQuote": true,
     "printWidth": 80
   }
   ```

## API Development

### Creating New Endpoints

1. **Generate Module Structure**
   ```bash
   # Generate new module with NestJS CLI
   npx nest g module products
   npx nest g controller products --no-spec
   npx nest g service products --no-spec
   npx nest g class products/dto/create-product.dto --no-spec
   npx nest g class products/dto/update-product.dto --no-spec
   ```

2. **Controller Implementation**
   ```typescript
   @Controller('products')
   @UseGuards(JwtAuthGuard, RolesGuard)
   export class ProductsController {
     constructor(private readonly productsService: ProductsService) {}
   
     @Get()
     @Roles('admin', 'editor', 'viewer')
     @ApiOperation({ summary: 'Get all products' })
     @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
     async findAll(@Query() query: ProductQueryDto) {
       return this.productsService.findAll(query);
     }

     @Get(':id')
     @Roles('admin', 'editor', 'viewer')
     @ApiOperation({ summary: 'Get product by ID' })
     @ApiResponse({ status: 200, description: 'Product retrieved successfully' })
     @ApiResponse({ status: 404, description: 'Product not found' })
     async findOne(@Param('id') id: string) {
       return this.productsService.findOne(id);
     }
   
     @Post()
     @Roles('admin', 'editor')
     @ApiOperation({ summary: 'Create new product' })
     @ApiResponse({ status: 201, description: 'Product created successfully' })
     @ApiResponse({ status: 400, description: 'Invalid product data' })
     async create(@Body() createProductDto: CreateProductDto, @Req() req: any) {
       return this.productsService.create(createProductDto, req.user.tenantId, req.user.id);
     }

     @Patch(':id')
     @Roles('admin', 'editor')
     @ApiOperation({ summary: 'Update product' })
     async update(
       @Param('id') id: string,
       @Body() updateProductDto: UpdateProductDto,
       @Req() req: any
     ) {
       return this.productsService.update(id, updateProductDto, req.user.tenantId, req.user.id);
     }

     @Delete(':id')
     @Roles('admin')
     @ApiOperation({ summary: 'Delete product' })
     async remove(@Param('id') id: string, @Req() req: any) {
       return this.productsService.remove(id, req.user.tenantId, req.user.id);
     }
   }
   ```

3. **Service Implementation**
   ```typescript
   @Injectable()
   export class ProductsService {
     constructor(
       @InjectRepository(Product)
       private readonly productRepository: Repository<Product>,
       private readonly cacheService: CacheService,
       private readonly eventBusService: EventBusService,
       private readonly loggerService: LoggerService,
     ) {}

     async findAll(query: ProductQueryDto): Promise<PaginatedResponse<Product>> {
       const cacheKey = `products:${JSON.stringify(query)}`;

       // Check cache first
       const cached = await this.cacheService.get(cacheKey);
       if (cached) {
         return cached;
       }

       // Build query
       const queryBuilder = this.productRepository.createQueryBuilder('product');

       if (query.search) {
         queryBuilder.where('product.name ILIKE :search OR product.description ILIKE :search', {
           search: `%${query.search}%`,
         });
       }

       if (query.categoryId) {
         queryBuilder.andWhere('product.categoryId = :categoryId', { categoryId: query.categoryId });
       }

       // Pagination
       const total = await queryBuilder.getCount();
       const products = await queryBuilder
         .orderBy('product.createdAt', 'DESC')
         .skip((query.page - 1) * query.limit)
         .take(query.limit)
         .getMany();

       const result = { data: products, total, page: query.page, limit: query.limit };

       // Cache result
       await this.cacheService.set(cacheKey, result, 300); // 5 minutes

       return result;
     }

     async create(createProductDto: CreateProductDto, tenantId: string, userId: string): Promise<Product> {
       this.loggerService.log(`Creating product: ${createProductDto.name}`);

       // Validate business rules
       await this.validateProductData(createProductDto);

       const product = this.productRepository.create({
         ...createProductDto,
         tenantId,
         createdBy: userId,
       });

       const savedProduct = await this.productRepository.save(product);

       // Clear related caches
       await this.cacheService.deletePattern('products:*');

       // Publish event
       await this.eventBusService.publish('product.created', {
         productId: savedProduct.id,
         tenantId,
         createdBy: userId,
       });

       this.loggerService.log(`Product created successfully: ${savedProduct.id}`);
       return savedProduct;
     }
   }
   ```

4. **DTO with Advanced Validation**
   ```typescript
   export class CreateProductDto {
     @IsString()
     @IsNotEmpty()
     @Length(1, 255)
     @ApiProperty({ description: 'Product name', example: 'MacBook Pro 14"' })
     name: string;
   
     @IsNumber()
     @Min(0)
     @Max(999999.99)
     @ApiProperty({ description: 'Product price', example: 1999.99 })
     price: number;
   
     @IsString()
     @IsOptional()
     @Length(0, 1000)
     @ApiProperty({ description: 'Product description', required: false })
     description?: string;

     @IsNumber()
     @Min(0)
     @ApiProperty({ description: 'Stock quantity', example: 100 })
     stock: number;

     @IsString()
     @Matches(/^[A-Z0-9-]+$/)
     @Length(1, 50)
     @ApiProperty({ description: 'Product SKU', example: 'MBP14-001' })
     sku: string;

     @IsUUID()
     @ApiProperty({ description: 'Category ID' })
     categoryId: string;

     @IsUUID()
     @ApiProperty({ description: 'Brand ID' })
     brandId: string;

     @IsUUID()
     @ApiProperty({ description: 'Vendor ID' })
     vendorId: string;

     @IsEnum(ProductStatus)
     @ApiProperty({ enum: ProductStatus, description: 'Product status' })
     status: ProductStatus;

     @IsArray()
     @IsUrl({}, { each: true })
     @ApiProperty({ description: 'Product images', type: [String] })
     images: string[];

     @IsObject()
     @IsOptional()
     @ApiProperty({ description: 'SEO metadata', required: false })
     seo?: {
       metaTitle?: string;
       metaDescription?: string;
       keywords?: string[];
     };
   }

   export class ProductQueryDto {
     @IsOptional()
     @IsString()
     @ApiProperty({ description: 'Search query', required: false })
     search?: string;

     @IsOptional()
     @IsUUID()
     @ApiProperty({ description: 'Category filter', required: false })
     categoryId?: string;

     @IsOptional()
     @IsEnum(ProductStatus)
     @ApiProperty({ enum: ProductStatus, required: false })
     status?: ProductStatus;

     @IsOptional()
     @IsNumber()
     @Min(0)
     @ApiProperty({ description: 'Minimum price', required: false })
     minPrice?: number;

     @IsOptional()
     @IsNumber()
     @Min(0)
     @ApiProperty({ description: 'Maximum price', required: false })
     maxPrice?: number;

     @IsOptional()
     @Type(() => Number)
     @IsNumber()
     @Min(1)
     @Max(100)
     @ApiProperty({ description: 'Page number', default: 1 })
     page?: number = 1;

     @IsOptional()
     @Type(() => Number)
     @IsNumber()
     @Min(1)
     @Max(100)
     @ApiProperty({ description: 'Items per page', default: 20 })
     limit?: number = 20;

     @IsOptional()
     @IsString()
     @ApiProperty({ description: 'Sort field', required: false })
     sortBy?: string = 'createdAt';

     @IsOptional()
     @IsEnum(['ASC', 'DESC'])
     @ApiProperty({ enum: ['ASC', 'DESC'], required: false })
     sortOrder?: 'ASC' | 'DESC' = 'DESC';
   }
   ```

### Authentication

1. **JWT Strategy**
   ```typescript
   @Injectable()
   export class JwtStrategy extends PassportStrategy(Strategy) {
     constructor() {
       super({
         jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
         ignoreExpiration: false,
         secretOrKey: process.env.JWT_SECRET,
       });
     }
   
     async validate(payload: any) {
       return { userId: payload.sub, username: payload.username };
     }
   }
   ```

2. **Guards**
   ```typescript
   @Injectable()
   export class JwtAuthGuard extends AuthGuard('jwt') {}
   
   @Injectable()
   export class RolesGuard implements CanActivate {
     constructor(private reflector: Reflector) {}
   
     canActivate(context: ExecutionContext): boolean {
       const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
         context.getHandler(),
         context.getClass(),
       ]);
       if (!requiredRoles) {
         return true;
       }
       const { user } = context.switchToHttp().getRequest();
       return requiredRoles.some((role) => user.roles?.includes(role));
     }
   }
   ```

### Database Operations

1. **Repository Pattern**
   ```typescript
   @Injectable()
   export class ProductsRepository {
     constructor(
       @InjectRepository(Product)
       private readonly repository: Repository<Product>,
     ) {}
   
     async findByCategory(categoryId: string): Promise<Product[]> {
       return this.repository.find({
         where: { categoryId },
         relations: ['category'],
       });
     }
   
     async searchProducts(query: string): Promise<Product[]> {
       return this.repository
         .createQueryBuilder('product')
         .where('product.name ILIKE :query', { query: `%${query}%` })
         .getMany();
     }
   }
   ```

2. **Migrations**
   ```typescript
   export class CreateProductsTable1234567890 implements MigrationInterface {
     public async up(queryRunner: QueryRunner): Promise<void> {
       await queryRunner.createTable(
         new Table({
           name: 'products',
           columns: [
             {
               name: 'id',
               type: 'uuid',
               isPrimary: true,
               generationStrategy: 'uuid',
               default: 'uuid_generate_v4()',
             },
             {
               name: 'name',
               type: 'varchar',
               length: '255',
             },
             {
               name: 'price',
               type: 'decimal',
               precision: 10,
               scale: 2,
             },
           ],
         }),
       );
     }
   
     public async down(queryRunner: QueryRunner): Promise<void> {
       await queryRunner.dropTable('products');
     }
   }
   ```

## Frontend Development

### React Components

1. **Component Structure**
   ```typescript
   interface ProductCardProps {
     product: Product;
     onAddToCart: (productId: string) => void;
   }
   
   export const ProductCard: React.FC<ProductCardProps> = ({
     product,
     onAddToCart,
   }) => {
     return (
       <div className="product-card">
         <img src={product.imageUrl} alt={product.name} />
         <h3>{product.name}</h3>
         <p>${product.price}</p>
         <button onClick={() => onAddToCart(product.id)}>
           Add to Cart
         </button>
       </div>
     );
   };
   ```

2. **Hooks**
   ```typescript
   export const useProducts = () => {
     const [products, setProducts] = useState<Product[]>([]);
     const [loading, setLoading] = useState(false);
   
     const fetchProducts = async () => {
       setLoading(true);
       try {
         const response = await api.get('/products');
         setProducts(response.data);
       } catch (error) {
         console.error('Failed to fetch products:', error);
       } finally {
         setLoading(false);
       }
     };
   
     useEffect(() => {
       fetchProducts();
     }, []);
   
     return { products, loading, refetch: fetchProducts };
   };
   ```

### State Management

1. **Context API**
   ```typescript
   interface CartContextType {
     items: CartItem[];
     addItem: (product: Product, quantity: number) => void;
     removeItem: (productId: string) => void;
     clearCart: () => void;
   }
   
   export const CartContext = createContext<CartContextType | undefined>(undefined);
   
   export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
     children,
   }) => {
     const [items, setItems] = useState<CartItem[]>([]);
   
     const addItem = (product: Product, quantity: number) => {
       setItems(prev => [...prev, { product, quantity }]);
     };
   
     const removeItem = (productId: string) => {
       setItems(prev => prev.filter(item => item.product.id !== productId));
     };
   
     const clearCart = () => {
       setItems([]);
     };
   
     return (
       <CartContext.Provider value={{ items, addItem, removeItem, clearCart }}>
         {children}
       </CartContext.Provider>
     );
   };
   ```

### API Integration

1. **API Client**
   ```typescript
   class ApiClient {
     private baseURL: string;
     private token: string | null = null;
   
     constructor(baseURL: string) {
       this.baseURL = baseURL;
     }
   
     setToken(token: string) {
       this.token = token;
     }
   
     async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
       const url = `${this.baseURL}${endpoint}`;
       const headers = {
         'Content-Type': 'application/json',
         ...(this.token && { Authorization: `Bearer ${this.token}` }),
         ...options.headers,
       };
   
       const response = await fetch(url, { ...options, headers });
   
       if (!response.ok) {
         throw new Error(`HTTP error! status: ${response.status}`);
       }
   
       return response.json();
     }
   
     async get<T>(endpoint: string): Promise<T> {
       return this.request<T>(endpoint, { method: 'GET' });
     }
   
     async post<T>(endpoint: string, data: any): Promise<T> {
       return this.request<T>(endpoint, {
         method: 'POST',
         body: JSON.stringify(data),
       });
     }
   }
   ```

## Testing

### Unit Tests

1. **Service Tests**
   ```typescript
   describe('ProductsService', () => {
     let service: ProductsService;
     let repository: Repository<Product>;
   
     beforeEach(async () => {
       const module: TestingModule = await Test.createTestingModule({
         providers: [
           ProductsService,
           {
             provide: getRepositoryToken(Product),
             useValue: {
               find: jest.fn(),
               create: jest.fn(),
               save: jest.fn(),
             },
           },
         ],
       }).compile();
   
       service = module.get<ProductsService>(ProductsService);
       repository = module.get<Repository<Product>>(getRepositoryToken(Product));
     });
   
     it('should return all products', async () => {
       const products = [{ id: '1', name: 'Product 1', price: 100 }];
       jest.spyOn(repository, 'find').mockResolvedValue(products);
   
       const result = await service.findAll();
       expect(result).toEqual(products);
     });
   });
   ```

2. **Controller Tests**
   ```typescript
   describe('ProductsController', () => {
     let controller: ProductsController;
     let service: ProductsService;
   
     beforeEach(async () => {
       const module: TestingModule = await Test.createTestingModule({
         controllers: [ProductsController],
         providers: [
           {
             provide: ProductsService,
             useValue: {
               findAll: jest.fn(),
               create: jest.fn(),
             },
           },
         ],
       }).compile();
   
       controller = module.get<ProductsController>(ProductsController);
       service = module.get<ProductsService>(ProductsService);
     });
   
     it('should return products', async () => {
       const products = [{ id: '1', name: 'Product 1', price: 100 }];
       jest.spyOn(service, 'findAll').mockResolvedValue(products);
   
       const result = await controller.findAll();
       expect(result).toEqual(products);
     });
   });
   ```

### Integration Tests

1. **API Tests**
   ```typescript
   describe('Products API', () => {
     let app: INestApplication;
   
     beforeEach(async () => {
       const moduleFixture: TestingModule = await Test.createTestingModule({
         imports: [AppModule],
       }).compile();
   
       app = moduleFixture.createNestApplication();
       await app.init();
     });
   
     it('/products (GET)', () => {
       return request(app.getHttpServer())
         .get('/products')
         .expect(200)
         .expect((res) => {
           expect(Array.isArray(res.body)).toBe(true);
         });
     });
   
     it('/products (POST)', () => {
       return request(app.getHttpServer())
         .post('/products')
         .send({
           name: 'Test Product',
           price: 100,
           description: 'Test Description',
         })
         .expect(201)
         .expect((res) => {
           expect(res.body.name).toBe('Test Product');
         });
     });
   });
   ```

### E2E Tests

1. **User Flow Tests**
   ```typescript
   describe('E2E User Flow', () => {
     let app: INestApplication;
   
     beforeEach(async () => {
       const moduleFixture: TestingModule = await Test.createTestingModule({
         imports: [AppModule],
       }).compile();
   
       app = moduleFixture.createNestApplication();
       await app.init();
     });
   
     it('should complete user registration and login flow', async () => {
       // Register user
       const registerResponse = await request(app.getHttpServer())
         .post('/auth/register')
         .send({
           email: 'test@example.com',
           password: 'password123',
           firstName: 'Test',
           lastName: 'User',
         })
         .expect(201);
   
       // Login user
       const loginResponse = await request(app.getHttpServer())
         .post('/auth/login')
         .send({
           email: 'test@example.com',
           password: 'password123',
         })
         .expect(200);
   
       expect(loginResponse.body.accessToken).toBeDefined();
     });
   });
   ```

## Deployment

### Docker

1. **Dockerfile**
   ```dockerfile
   FROM node:18-alpine
   
   WORKDIR /app
   
   COPY package*.json ./
   RUN npm ci --only=production
   
   COPY . .
   RUN npm run build
   
   EXPOSE 3000
   
   CMD ["npm", "run", "start:prod"]
   ```

2. **Docker Compose**
   ```yaml
   version: '3.8'
   services:
     app:
       build: .
       ports:
         - "3000:3000"
       environment:
         - DATABASE_URL=postgresql://postgres:password@db:5432/ayaztrade
         - REDIS_URL=redis://redis:6379
       depends_on:
         - db
         - redis
   
     db:
       image: postgres:13
       environment:
         POSTGRES_DB: ayaztrade
         POSTGRES_USER: postgres
         POSTGRES_PASSWORD: password
       volumes:
         - postgres_data:/var/lib/postgresql/data
   
     redis:
       image: redis:6
       volumes:
         - redis_data:/data
   
   volumes:
     postgres_data:
     redis_data:
   ```

### Kubernetes

1. **Deployment**
   ```yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: ayaztrade
   spec:
     replicas: 3
     selector:
       matchLabels:
         app: ayaztrade
     template:
       metadata:
         labels:
           app: ayaztrade
       spec:
         containers:
         - name: ayaztrade
           image: ayaztrade:latest
           ports:
           - containerPort: 3000
           env:
           - name: DATABASE_URL
             valueFrom:
               secretKeyRef:
                 name: ayaztrade-secrets
                 key: database-url
   ```

2. **Service**
   ```yaml
   apiVersion: v1
   kind: Service
   metadata:
     name: ayaztrade-service
   spec:
     selector:
       app: ayaztrade
     ports:
     - port: 80
       targetPort: 3000
     type: LoadBalancer
   ```

## Monitoring and Logging

### Logging

1. **Structured Logging**
   ```typescript
   import { Logger } from '@nestjs/common';
   
   @Injectable()
   export class ProductsService {
     private readonly logger = new Logger(ProductsService.name);
   
     async create(createProductDto: CreateProductDto) {
       this.logger.log(`Creating product: ${createProductDto.name}`);
       
       try {
         const product = await this.productRepository.create(createProductDto);
         const savedProduct = await this.productRepository.save(product);
         
         this.logger.log(`Product created successfully: ${savedProduct.id}`);
         return savedProduct;
       } catch (error) {
         this.logger.error(`Failed to create product: ${error.message}`);
         throw error;
       }
     }
   }
   ```

2. **Request Logging**
   ```typescript
   @Injectable()
   export class LoggingInterceptor implements NestInterceptor {
     private readonly logger = new Logger('HTTP');
   
     intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
       const request = context.switchToHttp().getRequest();
       const { method, url } = request;
       const now = Date.now();
   
       return next.handle().pipe(
         tap(() => {
           const { statusCode } = context.switchToHttp().getResponse();
           const responseTime = Date.now() - now;
           this.logger.log(
             `${method} ${url} ${statusCode} - ${responseTime}ms`,
           );
         }),
       );
     }
   }
   ```

### Health Checks

1. **Health Check Endpoint**
   ```typescript
   @Controller('health')
   export class HealthController {
     constructor(
       private readonly health: HealthCheckService,
       private readonly db: TypeOrmHealthIndicator,
       private readonly redis: RedisHealthIndicator,
     ) {}
   
     @Get()
     @HealthCheck()
     check() {
       return this.health.check([
         () => this.db.pingCheck('database'),
         () => this.redis.pingCheck('redis'),
       ]);
     }
   }
   ```

## Performance Optimization

### Database Optimization

1. **Query Optimization**
   ```typescript
   // Use select to limit fields
   const products = await this.productRepository.find({
     select: ['id', 'name', 'price'],
     where: { isActive: true },
     take: 20,
     skip: 0,
   });
   
   // Use relations efficiently
   const products = await this.productRepository.find({
     relations: ['category'],
     where: { categoryId: 'cat-123' },
   });
   ```

2. **Indexing**
   ```sql
   CREATE INDEX idx_products_category ON products(category_id);
   CREATE INDEX idx_products_price ON products(price);
   CREATE INDEX idx_products_active ON products(is_active);
   ```

### Caching

1. **Redis Caching**
   ```typescript
   @Injectable()
   export class ProductsService {
     constructor(
       @InjectRepository(Product)
       private readonly productRepository: Repository<Product>,
       @InjectRedis() private readonly redis: Redis,
     ) {}
   
     async findAll(): Promise<Product[]> {
       const cacheKey = 'products:all';
       const cached = await this.redis.get(cacheKey);
   
       if (cached) {
         return JSON.parse(cached);
       }
   
       const products = await this.productRepository.find();
       await this.redis.setex(cacheKey, 300, JSON.stringify(products));
   
       return products;
     }
   }
   ```

2. **Cache Decorator**
   ```typescript
   export function Cache(ttl: number = 300) {
     return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
       const method = descriptor.value;
   
       descriptor.value = async function (...args: any[]) {
         const cacheKey = `${target.constructor.name}:${propertyName}:${JSON.stringify(args)}`;
         const cached = await redis.get(cacheKey);
   
         if (cached) {
           return JSON.parse(cached);
         }
   
         const result = await method.apply(this, args);
         await redis.setex(cacheKey, ttl, JSON.stringify(result));
   
         return result;
       };
     };
   }
   ```

## Security

### Input Validation

1. **DTO Validation**
   ```typescript
   export class CreateProductDto {
     @IsString()
     @IsNotEmpty()
     @Length(1, 255)
     name: string;
   
     @IsNumber()
     @Min(0)
     @Max(999999.99)
     price: number;
   
     @IsString()
     @IsOptional()
     @Length(0, 1000)
     description?: string;
   }
   ```

2. **Sanitization**
   ```typescript
   import * as DOMPurify from 'isomorphic-dompurify';
   
   @Injectable()
   export class SanitizationPipe implements PipeTransform {
     transform(value: any) {
       if (typeof value === 'string') {
         return DOMPurify.sanitize(value);
       }
       return value;
     }
   }
   ```

### Rate Limiting

1. **Rate Limiting Guard**
   ```typescript
   @Injectable()
   export class RateLimitGuard implements CanActivate {
     constructor(private readonly redis: Redis) {}
   
     async canActivate(context: ExecutionContext): Promise<boolean> {
       const request = context.switchToHttp().getRequest();
       const ip = request.ip;
       const key = `rate_limit:${ip}`;
   
       const current = await this.redis.incr(key);
       if (current === 1) {
         await this.redis.expire(key, 60);
       }
   
       return current <= 100;
     }
   }
   ```

## Troubleshooting

### Common Issues

1. **Database Connection Issues**
   - Check database credentials
   - Verify database is running
   - Check network connectivity
   - Review connection pool settings

2. **Redis Connection Issues**
   - Verify Redis is running
   - Check Redis configuration
   - Monitor Redis memory usage
   - Review Redis logs

3. **API Performance Issues**
   - Monitor database queries
   - Check for N+1 query problems
   - Review caching strategy
   - Monitor memory usage

### Debugging

1. **Enable Debug Logging**
   ```typescript
   // In main.ts
   app.useLogger(['log', 'error', 'warn', 'debug', 'verbose']);
   ```

2. **Database Query Logging**
   ```typescript
   // In database configuration
   logging: ['query', 'error', 'schema', 'warn', 'info', 'log'],
   ```

3. **Performance Profiling**
   ```typescript
   import { performance } from 'perf_hooks';
   
   const start = performance.now();
   // Your code here
   const end = performance.now();
   console.log(`Execution time: ${end - start} milliseconds`);
   ```

---

**Need help?** Contact our development team at dev-support@ayaztrade.com or join our developer community at https://community.ayaztrade.com.