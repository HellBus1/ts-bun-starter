/**
 * Shared type definitions used across all layers.
 */

/**
 * Generic repository interface — all repositories should implement this.
 */
export interface IRepository<T, CreateDto, UpdateDto> {
  findAll(): Promise<T[]>;
  findById(id: number): Promise<T | null>;
  create(data: CreateDto): Promise<T>;
  update(id: number, data: UpdateDto): Promise<T | null>;
  deleteById(id: number): Promise<boolean>;
}

/**
 * Standard API response envelope.
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Paginated result wrapper.
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Pagination query parameters.
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}
