"""Windows-only hidden WGL check using the runtime's GLSL ES shader and exported GLB inputs.

This does not drive user apps. It creates an unshown test window, renders, reads pixels,
and releases the context. Desktop compatibility is not a Harmony/WebGL guarantee.
"""
import ctypes as c
from ctypes import wintypes as w
import json,sys,os
import numpy as np
from PIL import Image

def render(filename):
    data=json.load(open(filename,encoding='utf-8'));width,height=data['width'],data['height']
    user,gdi,opengl=c.windll.user32,c.windll.gdi32,c.windll.opengl32
    user.CreateWindowExW.argtypes=[w.DWORD,w.LPCWSTR,w.LPCWSTR,w.DWORD,c.c_int,c.c_int,c.c_int,c.c_int,w.HWND,w.HMENU,w.HINSTANCE,w.LPVOID];user.CreateWindowExW.restype=w.HWND
    user.GetDC.argtypes=[w.HWND];user.GetDC.restype=w.HDC;user.ReleaseDC.argtypes=[w.HWND,w.HDC];user.DestroyWindow.argtypes=[w.HWND]
    gdi.ChoosePixelFormat.argtypes=[w.HDC,c.c_void_p];gdi.SetPixelFormat.argtypes=[w.HDC,c.c_int,c.c_void_p]
    opengl.wglCreateContext.argtypes=[w.HDC];opengl.wglCreateContext.restype=c.c_void_p
    opengl.wglMakeCurrent.argtypes=[w.HDC,c.c_void_p];opengl.wglDeleteContext.argtypes=[c.c_void_p]
    opengl.wglGetProcAddress.argtypes=[c.c_char_p];opengl.wglGetProcAddress.restype=c.c_void_p
    hwnd=user.CreateWindowExW(0,'STATIC','YuShiJi AR hidden GPU check',0x80000000,0,0,width,height,None,None,None,None)
    dc=user.GetDC(hwnd);rc=None
    try:
        descriptor=c.create_string_buffer(40);c.c_ushort.from_buffer(descriptor,0).value=40;c.c_ushort.from_buffer(descriptor,2).value=1
        c.c_uint.from_buffer(descriptor,4).value=0x25;descriptor[9]=bytes([24]);descriptor[23]=bytes([24])
        pf=gdi.ChoosePixelFormat(dc,descriptor)
        if not pf or not gdi.SetPixelFormat(dc,pf,descriptor):raise RuntimeError('No OpenGL pixel format')
        rc=opengl.wglCreateContext(dc)
        if not rc or not opengl.wglMakeCurrent(dc,rc):raise RuntimeError('No hidden OpenGL context')
        def gl(name,result,*args):
            function=getattr(opengl,name,None)
            if function is None:
                address=opengl.wglGetProcAddress(name.encode())
                if not address or address in (1,2,3,c.c_void_p(-1).value):raise RuntimeError('Missing '+name)
                return c.WINFUNCTYPE(result,*args)(address)
            function.restype=result;function.argtypes=list(args);return function
        uint,integer,ptr,flt=c.c_uint,c.c_int,c.c_void_p,c.c_float
        create=gl('glCreateShader',uint,uint);source=gl('glShaderSource',None,uint,integer,c.POINTER(c.c_char_p),ptr);compile_shader=gl('glCompileShader',None,uint)
        shader_status=gl('glGetShaderiv',None,uint,uint,c.POINTER(integer));shader_log=gl('glGetShaderInfoLog',None,uint,integer,ptr,ptr)
        def shader(kind,text):
            item=create(kind);code=('#version 100\n'+text).encode();value=c.c_char_p(code);source(item,1,c.byref(value),None);compile_shader(item)
            status=integer();shader_status(item,0x8B81,c.byref(status))
            if not status.value:
                message=c.create_string_buffer(16384);shader_log(item,16384,None,message);raise RuntimeError(message.value.decode(errors='replace'))
            return item
        program=gl('glCreateProgram',uint)();attach=gl('glAttachShader',None,uint,uint)
        vs=shader(0x8B31,data['vertex']);fragment=shader(0x8B30,data['fragment']);attach(program,vs);attach(program,fragment);gl('glLinkProgram',None,uint)(program)
        linked=integer();gl('glGetProgramiv',None,uint,uint,c.POINTER(integer))(program,0x8B82,c.byref(linked))
        if not linked.value:
            message=c.create_string_buffer(16384);gl('glGetProgramInfoLog',None,uint,integer,ptr,ptr)(program,16384,None,message);raise RuntimeError(message.value.decode(errors='replace'))
        gl('glUseProgram',None,uint)(program)
        location=gl('glGetUniformLocation',integer,uint,c.c_char_p)
        def uniform(name,value,size=None):
            at=location(program,name.encode())
            if at<0:return
            if size:
                values=np.array(value,dtype=np.float32);gl('glUniformMatrix'+str(size)+'fv',None,integer,integer,c.c_ubyte,ptr)(at,1,False,values.ctypes.data)
            elif isinstance(value,list):
                values=np.array(value,dtype=np.float32);gl('glUniform'+str(len(value))+'fv',None,integer,integer,ptr)(at,1,values.ctypes.data)
            else:gl('glUniform1f',None,integer,flt)(at,value)
        uniform('mvp',data['mvp'],4);uniform('view',data['view'],4);m=data['view'];uniform('rotation',[m[i] for i in [0,1,2,4,5,6,8,9,10]],3)
        uniform('size',1);uniform('shiftY',0);uniform('exposure',data['exposure']);uniform('effectExposure',data['effectExposure']);uniform('materialMode',data['mode']);uniform('lightIntensity',data['lights'])
        for unit,name in enumerate(['colorMap','normalMap','materialMap','occlusionMap']):gl('glUniform1i',None,integer,integer)(location(program,name.encode()),unit)
        enable=gl('glEnable',None,uint);disable=gl('glDisable',None,uint);depth_mask=gl('glDepthMask',None,c.c_ubyte)
        gl('glViewport',None,integer,integer,integer,integer)(0,0,width,height);gl('glClearColor',None,flt,flt,flt,flt)(.11,.13,.14,1)
        gl('glClear',None,uint)(0x4100);enable(0x0B71);gl('glDepthFunc',None,uint)(0x0203)
        gen_buffer=gl('glGenBuffers',None,integer,c.POINTER(uint));bind_buffer=gl('glBindBuffer',None,uint,uint);buffer_data=gl('glBufferData',None,uint,c.c_ssize_t,ptr,uint)
        attribute=gl('glGetAttribLocation',integer,uint,c.c_char_p);attrib_pointer=gl('glVertexAttribPointer',None,uint,integer,uint,c.c_ubyte,integer,ptr)
        textures=[];buffers=[]
        def buffer(kind,array):
            value=uint();gen_buffer(1,c.byref(value));buffers.append(value);bind_buffer(kind,value);buffer_data(kind,array.nbytes,array.ctypes.data,0x88E4)
        def texture(unit,filename,default):
            gl('glActiveTexture',None,uint)(0x84C0+unit);value=uint();gl('glGenTextures',None,integer,c.POINTER(uint))(1,c.byref(value));textures.append(value)
            gl('glBindTexture',None,uint,uint)(0x0DE1,value)
            for name,value in [(0x2801,0x2601),(0x2800,0x2601),(0x2802,0x812F),(0x2803,0x812F)]:gl('glTexParameteri',None,uint,uint,integer)(0x0DE1,name,value)
            image=np.array(Image.open(filename).convert('RGBA')) if filename else np.array([[default]],dtype=np.uint8)
            gl('glTexImage2D',None,uint,integer,integer,integer,integer,integer,uint,uint,ptr)(0x0DE1,0,0x1908,image.shape[1],image.shape[0],0,0x1908,0x1401,image.ctypes.data)
        def depth(part):
            vertices=np.array(part['vertices']).reshape(-1,8)[:,:3];center=vertices.mean(axis=0);local=np.array(part['local']).reshape(4,4).T
            world=local@np.r_[center,1];return float(np.array(data['view']).reshape(4,4).T[2]@world)
        for part in sorted(data['parts'],key=lambda p:(p['transparent'],-depth(p) if p['transparent'] else 0)):
            local=np.array(part['local']).reshape(4,4).T;normal=np.linalg.inv(local[:3,:3]).T if not part['transparent'] else np.eye(3)
            uniform('local',part['local'],4);uniform('localNormal',normal.T.flatten().tolist(),3);uniform('unlit',part['unlit']);uniform('transparent',int(part['transparent']))
            uniform('color',part['color']);uniform('materialParams',part['params']);uniform('normalScale',part['normalScale']);uniform('repeatUV',part['wrap'])
            if part['transparent']:
                enable(0x0BE2);gl('glBlendFuncSeparate',None,uint,uint,uint,uint)(0x0302,0x0303,1,0x0303);depth_mask(False)
            else:disable(0x0BE2);depth_mask(True)
            if part['doubleSided']:disable(0x0B44)
            else:enable(0x0B44)
            vertices=np.array(part['vertices'],dtype=np.float32);buffer(0x8892,vertices)
            for name,count,offset in [('position',3,0),('normal',3,12),('uv',2,24)]:
                at=attribute(program,name.encode())
                if at>=0:gl('glEnableVertexAttribArray',None,uint)(at);attrib_pointer(at,count,0x1406,False,32,c.c_void_p(offset))
            tangents=np.array(part['tangents'],dtype=np.float32);buffer(0x8892,tangents);at=attribute(program,b'tangent')
            if at>=0:gl('glEnableVertexAttribArray',None,uint)(at);attrib_pointer(at,4,0x1406,False,16,None)
            for unit,(name,default) in enumerate([('image',[255]*4),('normalImage',[128,128,255,255]),('materialImage',[255]*4),('occlusionImage',[255]*4)]):texture(unit,part[name],default)
            indices=np.array(part['indices'],dtype=np.uint16);buffer(0x8893,indices);gl('glDrawElements',None,uint,integer,uint,ptr)(4,len(indices),0x1403,None)
        gl('glFinish',None)();error=gl('glGetError',uint)()
        if error:raise RuntimeError('OpenGL error '+hex(error))
        pixels=np.zeros((height,width,4),dtype=np.uint8);gl('glReadPixels',None,integer,integer,integer,integer,uint,uint,ptr)(0,0,width,height,0x1908,0x1401,pixels.ctypes.data)
        output=os.path.splitext(filename)[0]+'.png';Image.fromarray(pixels[::-1,:,:3]).save(output)
        for value in buffers:gl('glDeleteBuffers',None,integer,c.POINTER(uint))(1,c.byref(value))
        for value in textures:gl('glDeleteTextures',None,integer,c.POINTER(uint))(1,c.byref(value))
        gl('glDeleteProgram',None,uint)(program);gl('glDeleteShader',None,uint)(vs);gl('glDeleteShader',None,uint)(fragment)
        print(output)
    finally:
        opengl.wglMakeCurrent(None,None)
        if rc:opengl.wglDeleteContext(rc)
        user.ReleaseDC(hwnd,dc);user.DestroyWindow(hwnd)

for filename in sys.argv[1:]:render(filename)
