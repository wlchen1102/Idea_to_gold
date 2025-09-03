-- 创建 exec_sql 函数，用于执行任意 SQL 查询
      CREATE OR REPLACE FUNCTION exec_sql(sql TEXT)
      RETURNS TABLE(result JSONB)
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $$
      DECLARE
        rec RECORD;
        result_array JSONB[] := '{}';
        row_json JSONB;
      BEGIN
        -- 执行传入的 SQL 并将结果转换为 JSONB 数组
        FOR rec IN EXECUTE sql LOOP
          row_json := to_jsonb(rec);
          result_array := result_array || row_json;
        END LOOP;
        
        -- 返回结果数组中的每个元素
        FOR i IN 1..array_length(result_array, 1) LOOP
          result := result_array[i];
          RETURN NEXT;
        END LOOP;
        
        RETURN;
      END;
      $$;